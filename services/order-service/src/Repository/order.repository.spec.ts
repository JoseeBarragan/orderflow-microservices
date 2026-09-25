import { status } from "@grpc/grpc-js";
import { Test, TestingModule } from "@nestjs/testing";
import { OrderRepository } from "./order.repository";
import { PrismaService } from "../prisma.service";
import type { OrderItems } from "../types/order.entity";

type TxMock = {
  order: { create: jest.Mock; updateMany: jest.Mock };
  outboxEvent: { create: jest.Mock };
};

describe("OrderRepository", () => {
  let repository: OrderRepository;
  let prisma: {
    order: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      updateMany: jest.Mock;
    };
    outboxEvent: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      order: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
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
      prisma.order.findUnique.mockResolvedValue({
        orderId: "o1",
        status: "PENDING",
        totalAmount: "1000.00",
        items: [{ productId: "p1", quantity: 2, unitPrice: "500.00" }],
      });

      const result = await repository.getById("o1");

      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { orderId: "o1" },
        include: { items: true },
      });
      expect(result).toEqual({
        orderId: "o1",
        status: "PENDING",
        totalAmount: 1000,
        items: [{ productId: "p1", quantity: 2, unitPrice: 500 }],
      });
    });

    it("devuelve null cuando la orden no existe", async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      const result = await repository.getById("missing");

      expect(result).toBeNull();
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
      status: "CONFIRMED",
      totalAmount: "1000.00",
      items: [
        { productId: "p1", quantity: 2, unitPrice: "500.00" },
        { productId: "p2", quantity: 1, unitPrice: "700.50" },
      ],
    };

    it("mapea las órdenes a { orders } con status y montos numéricos", async () => {
      prisma.order.findMany.mockResolvedValue([rawOrder]);

      const result = await repository.getAll();

      expect(prisma.order.findMany).toHaveBeenCalledWith({
        include: { items: true },
      });
      expect(result).toEqual({
        orders: [
          {
            orderId: "o1",
            status: "CONFIRMED",
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
        order: {
          create: jest.fn().mockResolvedValue(order),
          updateMany: jest.fn(),
        },
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

  describe("updateStatusIfPending", () => {
    it("transiciona el estado filtrando por status PENDING", async () => {
      prisma.order.updateMany.mockResolvedValue({ count: 1 });

      const result = await repository.updateStatusIfPending("o1", "CANCELLED");

      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: { orderId: "o1", status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      expect(result).toBe(true);
    });

    it("confirma la orden pasando CONFIRMED", async () => {
      prisma.order.updateMany.mockResolvedValue({ count: 1 });

      const result = await repository.updateStatusIfPending("o1", "CONFIRMED");

      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: { orderId: "o1", status: "PENDING" },
        data: { status: "CONFIRMED" },
      });
      expect(result).toBe(true);
    });

    it("devuelve false sin tocar la orden cuando ya no está PENDING", async () => {
      prisma.order.updateMany.mockResolvedValue({ count: 0 });

      const result = await repository.updateStatusIfPending("o1", "CANCELLED");

      expect(result).toBe(false);
    });

    it("devuelve false sin error cuando la orden no existe", async () => {
      prisma.order.updateMany.mockResolvedValue({ count: 0 });

      const result = await repository.updateStatusIfPending(
        "missing",
        "CONFIRMED",
      );

      expect(result).toBe(false);
    });

    it("lanza RpcException INTERNAL cuando prisma falla", async () => {
      prisma.order.updateMany.mockRejectedValue(new Error("db down"));

      await expect(
        repository.updateStatusIfPending("o1", "CANCELLED"),
      ).rejects.toMatchObject({
        error: { code: status.INTERNAL },
      });
    });
  });
  describe("findStalePending", () => {
    it("busca ordenes PENDING creadas antes de la fecha dada", async () => {
      const olderThan = new Date("2026-01-01T00:00:00.000Z");
      const stale = [{ orderId: "o1", status: "PENDING" }];
      prisma.order.findMany.mockResolvedValue(stale);

      const result = await repository.findStalePending(olderThan);

      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: { status: "PENDING", createdAt: { lt: olderThan } },
      });
      expect(result).toEqual(stale);
    });

    it("devuelve lista vacia cuando no hay ordenes viejas", async () => {
      prisma.order.findMany.mockResolvedValue([]);

      const result = await repository.findStalePending(new Date());

      expect(result).toEqual([]);
    });
  });

  describe("cancelIfPendingAndEmit", () => {
    const buildTx = (count: number): TxMock => ({
      order: {
        create: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count }),
      },
      outboxEvent: { create: jest.fn().mockResolvedValue(undefined) },
    });

    it("cancela la orden y emite order.cancelled en la misma transaccion", async () => {
      const tx = buildTx(1);
      prisma.$transaction.mockImplementation(
        async (cb: (tx: TxMock) => Promise<unknown>) => cb(tx),
      );

      const result = await repository.cancelIfPendingAndEmit("o1");

      expect(result).toBe(true);
      expect(tx.order.updateMany).toHaveBeenCalledWith({
        where: { orderId: "o1", status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      expect(tx.outboxEvent.create).toHaveBeenCalledWith({
        data: {
          eventType: "order.cancelled",
          payload: { orderId: "o1" },
        },
      });
    });

    it("no emite order.cancelled si la orden ya no estaba PENDING", async () => {
      const tx = buildTx(0);
      prisma.$transaction.mockImplementation(
        async (cb: (tx: TxMock) => Promise<unknown>) => cb(tx),
      );

      const result = await repository.cancelIfPendingAndEmit("o1");

      expect(result).toBe(false);
      expect(tx.outboxEvent.create).not.toHaveBeenCalled();
    });

    it("propaga como RpcException cuando la transaccion falla", async () => {
      prisma.$transaction.mockRejectedValue(new Error("db down"));

      await expect(
        repository.cancelIfPendingAndEmit("o1"),
      ).rejects.toMatchObject({ error: { code: status.INTERNAL } });
    });
  });
});
