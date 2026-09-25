import { Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Test, TestingModule } from "@nestjs/testing";
import { PaymentRepository } from "./payment.repository";
import { PrismaService } from "../prisma.service";
import {
  PaymentAlreadySettledError,
  PaymentNotFoundError,
} from "../types/Error.type";

const uniqueViolation = () =>
  new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "7.9.1",
  });

type TxMock = {
  payment: { updateMany: jest.Mock; findUnique: jest.Mock };
  outboxEvent: { create: jest.Mock };
};

describe("PaymentRepository", () => {
  let repository: PaymentRepository;
  let prisma: {
    payment: { create: jest.Mock; findUnique: jest.Mock };
    outboxEvent: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let errorSpy: jest.SpyInstance;

  const buildTx = (): TxMock => ({
    payment: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUnique: jest.fn(),
    },
    outboxEvent: { create: jest.fn().mockResolvedValue(undefined) },
  });

  const wire = (tx: TxMock) =>
    prisma.$transaction.mockImplementation(
      async (cb: (tx: TxMock) => Promise<unknown>) => cb(tx),
    );

  beforeEach(async () => {
    prisma = {
      payment: { create: jest.fn(), findUnique: jest.fn() },
      outboxEvent: { create: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<PaymentRepository>(PaymentRepository);
    errorSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("confirmPayment", () => {
    it("transiciona el pago filtrando por status PENDING y emite el outbox en la misma transacción", async () => {
      const tx = buildTx();
      wire(tx);

      const result = await repository.confirmPayment(
        "o1",
        "APPROVED",
        "payment.approved",
        { orderId: "o1" },
      );

      expect(tx.payment.updateMany).toHaveBeenCalledWith({
        where: { orderId: "o1", status: "PENDING" },
        data: { status: "APPROVED" },
      });
      expect(tx.outboxEvent.create).toHaveBeenCalledWith({
        data: {
          eventType: "payment.approved",
          payload: { orderId: "o1" },
        },
      });
      expect(result).toEqual({ orderId: "o1" });
    });

    it("lanza PaymentAlreadySettledError y no emite outbox si el pago ya no está PENDING", async () => {
      const tx = buildTx();
      tx.payment.updateMany.mockResolvedValue({ count: 0 });
      tx.payment.findUnique.mockResolvedValue({
        orderId: "o1",
        status: "FAILED",
      });
      wire(tx);

      await expect(
        repository.confirmPayment("o1", "APPROVED", "payment.approved", {
          orderId: "o1",
        }),
      ).rejects.toBeInstanceOf(PaymentAlreadySettledError);

      expect(tx.outboxEvent.create).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("lanza PaymentNotFoundError si el pago no existe", async () => {
      const tx = buildTx();
      tx.payment.updateMany.mockResolvedValue({ count: 0 });
      tx.payment.findUnique.mockResolvedValue(null);
      wire(tx);

      await expect(
        repository.confirmPayment("o1", "APPROVED", "payment.approved", {
          orderId: "o1",
        }),
      ).rejects.toBeInstanceOf(PaymentNotFoundError);

      expect(tx.outboxEvent.create).not.toHaveBeenCalled();
    });

    it("no deja pasar una segunda confirmación sobre un pago ya APPROVED", async () => {
      const tx = buildTx();
      tx.payment.updateMany.mockResolvedValue({ count: 0 });
      tx.payment.findUnique.mockResolvedValue({
        orderId: "o1",
        status: "APPROVED",
      });
      wire(tx);

      await expect(
        repository.confirmPayment("o1", "APPROVED", "payment.approved", {
          orderId: "o1",
        }),
      ).rejects.toThrow(/ya fue procesado/);

      expect(tx.payment.updateMany).toHaveBeenCalledTimes(1);
      expect(tx.outboxEvent.create).not.toHaveBeenCalled();
    });

    it("loguea y propaga el error cuando la transacción falla", async () => {
      const error = new Error("tx failed");
      prisma.$transaction.mockRejectedValue(error);

      await expect(
        repository.confirmPayment("o1", "FAILED", "payment.failed", {
          orderId: "o1",
        }),
      ).rejects.toThrow(error);
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe("createPayment", () => {
    it("crea el pago con orderId y totalAmount", async () => {
      const created = { id: "pay-1", orderId: "o1", totalAmount: 3000 };
      prisma.payment.create.mockResolvedValue(created);

      const result = await repository.createPayment("o1", 3000);

      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: { orderId: "o1", totalAmount: 3000 },
      });
      expect(result).toEqual(created);
    });

    it("devuelve el pago existente sin fallar ante una entrega duplicada", async () => {
      const existing = { id: "pay-1", orderId: "o1", totalAmount: 3000 };
      prisma.payment.create.mockRejectedValue(uniqueViolation());
      prisma.payment.findUnique.mockResolvedValue(existing);

      const result = await repository.createPayment("o1", 3000);

      expect(result).toEqual(existing);
      expect(prisma.payment.findUnique).toHaveBeenCalledWith({
        where: { orderId: "o1" },
      });
    });

    it("no ensucia el log de errores ante una entrega duplicada", async () => {
      prisma.payment.create.mockRejectedValue(uniqueViolation());
      prisma.payment.findUnique.mockResolvedValue({ orderId: "o1" });

      await repository.createPayment("o1", 3000);

      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("loguea y propaga el error cuando prisma falla por otra causa", async () => {
      const error = new Error("db down");
      prisma.payment.create.mockRejectedValue(error);

      await expect(repository.createPayment("o1", 3000)).rejects.toThrow(error);
      expect(prisma.payment.findUnique).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
