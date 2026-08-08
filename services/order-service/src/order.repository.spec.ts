import { Test, TestingModule } from "@nestjs/testing";
import { ServiceUnavailableException } from "@nestjs/common";
import { OrderRepository } from "./order.repository";
import { PrismaService } from "./prisma.service";

type TxMock = {
  order: { create: jest.Mock };
  outboxEvent: { create: jest.Mock };
};

describe("OrderRepository", () => {
  let repository: OrderRepository;
  let prisma: {
    order: { findMany: jest.Mock };
    outboxEvent: { findMany: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      order: { findMany: jest.fn() },
      outboxEvent: { findMany: jest.fn(), update: jest.fn() },
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

  describe("getAll", () => {
    it("delega a prisma.order.findMany y devuelve el resultado", async () => {
      const orders = [{ id: "order-1" }, { id: "order-2" }];
      prisma.order.findMany.mockResolvedValue(orders);

      const result = await repository.getAll();

      expect(result).toEqual(orders);
      expect(prisma.order.findMany).toHaveBeenCalledTimes(1);
    });

    it("lanza ServiceUnavailableException cuando prisma falla", async () => {
      prisma.order.findMany.mockRejectedValue(new Error("db down"));

      await expect(repository.getAll()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe("create", () => {
    const items = [
      { productId: "p1", quantity: 2, unitPrice: 1500 },
      { productId: "p2", quantity: 1, unitPrice: 1000 },
    ];

    it("ejecuta orden + outbox en una transacción y devuelve la orden", async () => {
      const order = { id: "order-1", totalAmount: 4000, items };
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
          eventType: "OrderCreated",
          payload: { orderId: order.id, items, totalAmount: 4000 },
        },
      });
    });

    it("lanza ServiceUnavailableException cuando la transacción falla", async () => {
      prisma.$transaction.mockRejectedValue(new Error("tx failed"));

      await expect(repository.create(4000, items)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe("getPendingMessage", () => {
    it("busca eventos no publicados ordenados por createdAt asc (take 20)", async () => {
      const events = [{ id: "ev-1" }, { id: "ev-2" }];
      prisma.outboxEvent.findMany.mockResolvedValue(events);

      const result = await repository.getPendingMessage();

      expect(result).toEqual(events);
      expect(prisma.outboxEvent.findMany).toHaveBeenCalledWith({
        where: { published: false },
        orderBy: { createdAt: "asc" },
        take: 20,
      });
    });

    it("lanza ServiceUnavailableException cuando prisma falla", async () => {
      prisma.outboxEvent.findMany.mockRejectedValue(new Error("db down"));

      await expect(repository.getPendingMessage()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe("updateMessagePublish", () => {
    it("marca el evento como publicado con fecha actual", async () => {
      const fakeDate = new Date("2025-01-01T00:00:00Z");
      jest.useFakeTimers({ now: fakeDate });
      prisma.outboxEvent.update.mockResolvedValue(undefined);

      await repository.updateMessagePublish("ev-1", true);

      expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
        where: { id: "ev-1" },
        data: { published: true, publishedAt: fakeDate },
      });
      jest.useRealTimers();
    });

    it("lanza ServiceUnavailableException cuando prisma falla", async () => {
      prisma.outboxEvent.update.mockRejectedValue(new Error("db down"));

      await expect(
        repository.updateMessagePublish("ev-1", true),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
