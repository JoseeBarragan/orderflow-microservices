import { status } from "@grpc/grpc-js";
import { Test, TestingModule } from "@nestjs/testing";
import { OrderRepository } from "./order.repository";
import { PrismaService } from "../prisma.service";
import type { OrderItems } from "../types/order.entity";

type TxMock = {
  order: { create: jest.Mock };
  outboxEvent: { create: jest.Mock };
};

describe("OrderRepository", () => {
  let repository: OrderRepository;
  let prisma: {
    order: { findUnique: jest.Mock; findMany: jest.Mock; update: jest.Mock };
    outboxEvent: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      order: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      outboxEvent: { create: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<OrderRepository>(OrderRepository);
  });

  describe("getById", () => {
    it("busca la orden por orderId incluyendo sus items", async () => {
      const order = { orderId: "o1", status: "PENDING", items: [] };
      prisma.order.findUnique.mockResolvedValue(order);

      const result = await repository.getById("o1");

      expect(result).toEqual(order);
      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { orderId: "o1" },
        include: { items: true },
      });
    });

    it("lanza RpcException INTERNAL cuando prisma falla", async () => {
      prisma.order.findUnique.mockRejectedValue(new Error("db down"));

      await expect(repository.getById("o1")).rejects.toMatchObject({
        error: { code: status.INTERNAL },
      });
    });
  });

  describe("getAll", () => {
    const rawOrder = {
      orderId: "o1",
      totalAmount: "1000.00",
      items: [
        { productId: "p1", quantity: 2, unitPrice: "500.00" },
        { productId: "p2", quantity: 1, unitPrice: "700.50" },
      ],
    };

    it("mapea las órdenes a { orders } con totalAmount y unitPrice numéricos", async () => {
      prisma.order.findMany.mockResolvedValue([rawOrder]);

      const result = await repository.getAll();

      expect(prisma.order.findMany).toHaveBeenCalledWith({
        include: { items: true },
      });
      expect(result).toEqual({
        orders: [
          {
            orderId: "o1",
            totalAmount: 1000,
            items: [
              { productId: "p1", quantity: 2, unitPrice: 500 },
              { productId: "p2", quantity: 1, unitPrice: 700.5 },
            ],
          },
        ],
      });
    });

    it("lanza RpcException INTERNAL cuando prisma falla", async () => {
      prisma.order.findMany.mockRejectedValue(new Error("db down"));

      await expect(repository.getAll()).rejects.toMatchObject({
        error: { code: status.INTERNAL },
      });
    });
  });

  describe("create", () => {
    const items: OrderItems[] = [
      { productId: "p1", quantity: 2, unitPrice: 1500 },
      { productId: "p2", quantity: 1, unitPrice: 1000 },
    ];

    it("ejecuta orden + outbox en una transacción y devuelve la orden", async () => {
      const order = {
        id: "order-1",
        orderId: "order-1",
        totalAmount: 4000,
        items,
      };
      const tx: TxMock = {
        order: { create: jest.fn().mockResolvedValue(order) },
        outboxEvent: { create: jest.fn().mockResolvedValue(undefined) },
      };
      prisma.$transaction.mockImplementation(
        async (cb: (tx: TxMock) => Promise<unknown>) => cb(tx),
      );

      const result = await repository.create(4000, items);

      expect(result).toEqual(order);
      expect(tx.order.create).toHaveBeenCalledWith({
        data: {
          totalAmount: 4000,
          items: { create: items },
        },
        include: { items: true },
      });
      expect(tx.outboxEvent.create).toHaveBeenCalledWith({
        data: {
          eventType: "order.created",
          payload: {
            orderId: "order-1",
            items,
            totalAmount: 4000,
          },
        },
      });
    });

    it("lanza RpcException INTERNAL cuando la transacción falla", async () => {
      prisma.$transaction.mockRejectedValue(new Error("tx failed"));

      await expect(repository.create(4000, items)).rejects.toMatchObject({
        error: { code: status.INTERNAL },
      });
    });
  });

  describe("updateStatusOrder", () => {
    it("actualiza el estado de la orden", async () => {
      const updated = { orderId: "o1", status: "CANCELLED" };
      prisma.order.update.mockResolvedValue(updated);

      const result = await repository.updateStatusOrder("o1", "CANCELLED");

      expect(result).toEqual(updated);
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { orderId: "o1" },
        data: { status: "CANCELLED" },
      });
    });

    it("lanza RpcException INTERNAL cuando prisma falla", async () => {
      prisma.order.update.mockRejectedValue(new Error("db down"));

      await expect(
        repository.updateStatusOrder("o1", "CANCELLED"),
      ).rejects.toMatchObject({
        error: { code: status.INTERNAL },
      });
    });
  });
});
