import { Logger } from "@nestjs/common";
import { status } from "@grpc/grpc-js";
import { Test, TestingModule } from "@nestjs/testing";
import { InventoryRepository } from "./Inventory.repository";
import { PrismaService } from "../prisma.service";
import type { NewOrder } from "../types/Inventory.types";

type TxMock = {
  products: {
    updateMany: jest.Mock;
    update: jest.Mock;
  };
  stock_reservations: {
    createMany: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  outbox_events: { create: jest.Mock };
};

describe("InventoryRepository", () => {
  let repository: InventoryRepository;
  let prisma: {
    products: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(async () => {
    prisma = {
      products: { findMany: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<InventoryRepository>(InventoryRepository);
    errorSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
    warnSpy = jest
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("findAll", () => {
    it("mapea los productos a { items } con unitPriceCents y availableStock", async () => {
      prisma.products.findMany.mockResolvedValue([
        {
          id: "p1",
          name: "Test",
          unitPrice: "1500.00",
          available_stock: 10,
          created_at: new Date(),
        },
      ]);

      const result = await repository.findAll(10, 20);

      expect(prisma.products.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 20,
        orderBy: { created_at: "desc" },
      });
      expect(result).toEqual({
        items: [
          {
            id: "p1",
            name: "Test",
            unitPriceCents: 150000,
            availableStock: 10,
          },
        ],
      });
    });

    it("usa los defaults 50 y 0 cuando no recibe argumentos", async () => {
      prisma.products.findMany.mockResolvedValue([]);

      await repository.findAll();

      expect(prisma.products.findMany).toHaveBeenCalledWith({
        take: 50,
        skip: 0,
        orderBy: { created_at: "desc" },
      });
    });

    it("lanza RpcException INTERNAL cuando prisma falla", async () => {
      prisma.products.findMany.mockRejectedValue(new Error("db down"));

      await expect(repository.findAll()).rejects.toMatchObject({
        error: { code: status.INTERNAL },
      });
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe("findByIds", () => {
    it("busca productos cuyo id esté en la lista", async () => {
      const products = [
        { id: "p1", name: "A", available_stock: 5 },
        { id: "p2", name: "B", available_stock: 3 },
      ];
      prisma.products.findMany.mockResolvedValue(products);

      const result = await repository.findByIds(["p1", "p2"]);

      expect(result).toEqual(products);
      expect(prisma.products.findMany).toHaveBeenCalledWith({
        where: { id: { in: ["p1", "p2"] } },
      });
    });

    it("rellanza el error original cuando prisma falla", async () => {
      const error = new Error("db down");
      prisma.products.findMany.mockRejectedValue(error);

      await expect(repository.findByIds(["p1"])).rejects.toThrow(error);
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe("reserveStock", () => {
    const order: NewOrder = {
      orderId: "o1",
      totalAmount: 3000,
      items: [
        { productId: "p1", quantity: 2, unitPrice: 1500 },
        { productId: "p2", quantity: 1, unitPrice: 1000 },
      ],
    };

    const buildTx = (): TxMock => ({
      products: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(),
      },
      stock_reservations: {
        createMany: jest.fn().mockResolvedValue(undefined),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      outbox_events: { create: jest.fn().mockResolvedValue(undefined) },
    });

    it("reserva stock, crea la reserva y emite stock.reserve en una transacción", async () => {
      const tx = buildTx();
      prisma.$transaction.mockImplementation(
        async (cb: (tx: TxMock) => Promise<unknown>) => cb(tx),
      );

      const result = await repository.reserveStock(order);

      expect(result).toEqual({ success: true });
      expect(tx.products.updateMany).toHaveBeenCalledTimes(2);
      expect(tx.products.updateMany).toHaveBeenNthCalledWith(1, {
        where: { id: "p1", available_stock: { gte: 2 } },
        data: {
          available_stock: { decrement: 2 },
          reserved_stock: { increment: 2 },
        },
      });
      expect(tx.stock_reservations.createMany).toHaveBeenCalledWith({
        data: [
          { order_id: "o1", product_id: "p1", quantity: 2 },
          { order_id: "o1", product_id: "p2", quantity: 1 },
        ],
      });
      expect(tx.outbox_events.create).toHaveBeenCalledWith({
        data: {
          event_type: "stock.reserve",
          payload: {
            orderId: "o1",
            items: order.items,
            totalAmount: 3000,
          },
        },
      });
    });

    it("devuelve { success: false } con el reason cuando el stock es insuficiente", async () => {
      const tx = buildTx();
      tx.products.updateMany.mockResolvedValue({ count: 0 });
      prisma.$transaction.mockImplementation(
        async (cb: (tx: TxMock) => Promise<unknown>) => cb(tx),
      );

      const result = await repository.reserveStock(order);

      expect(result).toEqual({
        success: false,
        reason: "Stock insuficiente para producto p1",
      });
    });

    it("rellanza el error cuando la transacción falla con otra excepción", async () => {
      const error = new Error("tx failed");
      prisma.$transaction.mockRejectedValue(error);

      await expect(repository.reserveStock(order)).rejects.toThrow(error);
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe("releaseStock", () => {
    const buildTx = (): TxMock => ({
      products: { updateMany: jest.fn(), update: jest.fn() },
      stock_reservations: {
        createMany: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      outbox_events: { create: jest.fn() },
    });

    it("libera las reservas activas de la orden", async () => {
      const tx = buildTx();
      tx.stock_reservations.findMany.mockResolvedValue([
        { id: "r1", product_id: "p1", quantity: 2, released: false },
      ]);
      prisma.$transaction.mockImplementation(
        async (cb: (tx: TxMock) => Promise<unknown>) => cb(tx),
      );

      const result = await repository.releaseStock("o1");

      expect(result).toBeUndefined();
      expect(tx.stock_reservations.findMany).toHaveBeenCalledWith({
        where: { order_id: "o1", released: false },
      });
      expect(tx.stock_reservations.updateMany).toHaveBeenCalledWith({
        where: { id: "r1", released: false },
        data: { released: true },
      });
      expect(tx.products.update).toHaveBeenCalledWith({
        where: { id: "p1", available_stock: { gte: 0 } },
        data: {
          available_stock: { increment: 2 },
          reserved_stock: { decrement: 2 },
        },
      });
    });

    it("no libera dos veces una reserva cuya liberación ya fue reclamada por otra transacción", async () => {
      const tx = buildTx();
      tx.stock_reservations.findMany.mockResolvedValue([
        { id: "r1", product_id: "p1", quantity: 2, released: false },
      ]);
      tx.stock_reservations.updateMany.mockResolvedValue({ count: 0 });
      prisma.$transaction.mockImplementation(
        async (cb: (tx: TxMock) => Promise<unknown>) => cb(tx),
      );

      await repository.releaseStock("o1");

      expect(tx.stock_reservations.updateMany).toHaveBeenCalledWith({
        where: { id: "r1", released: false },
        data: { released: true },
      });
      expect(tx.products.update).not.toHaveBeenCalled();
    });

    it("no hace nada y avisa cuando no hay reservas activas", async () => {
      const tx = buildTx();
      tx.stock_reservations.findMany.mockResolvedValue([]);
      prisma.$transaction.mockImplementation(
        async (cb: (tx: TxMock) => Promise<unknown>) => cb(tx),
      );

      const result = await repository.releaseStock("o1");

      expect(result).toBeUndefined();
      expect(tx.products.update).not.toHaveBeenCalled();
      expect(tx.stock_reservations.updateMany).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
    });

    it("lanza RpcException INTERNAL cuando prisma falla", async () => {
      prisma.$transaction.mockRejectedValue(new Error("tx failed"));

      await expect(repository.releaseStock("o1")).rejects.toMatchObject({
        error: { code: status.INTERNAL },
      });
      expect(errorSpy).toHaveBeenCalled();
    });
  });
  describe("consumeStock", () => {
    const buildTx = (): TxMock => ({
      products: { updateMany: jest.fn(), update: jest.fn() },
      stock_reservations: {
        createMany: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      outbox_events: { create: jest.fn() },
    });

    const reservation = {
      id: "r1",
      order_id: "o1",
      product_id: "p1",
      quantity: 2,
      released: false,
    };

    it("baja reserved_stock de las reservas activas de la orden", async () => {
      const tx = buildTx();
      tx.stock_reservations.findMany.mockResolvedValue([reservation]);
      prisma.$transaction.mockImplementation(
        async (cb: (tx: TxMock) => Promise<unknown>) => cb(tx),
      );

      await repository.consumeStock("o1");

      expect(tx.stock_reservations.findMany).toHaveBeenCalledWith({
        where: { order_id: "o1", released: false },
      });
      expect(tx.products.update).toHaveBeenCalledWith({
        where: { id: "p1", available_stock: { gte: 0 } },
        data: { reserved_stock: { decrement: 2 } },
      });
    });

    it("NO repone available_stock porque la unidad ya se vendio", async () => {
      const tx = buildTx();
      tx.stock_reservations.findMany.mockResolvedValue([reservation]);
      prisma.$transaction.mockImplementation(
        async (cb: (tx: TxMock) => Promise<unknown>) => cb(tx),
      );

      await repository.consumeStock("o1");

      const [updateArg] = tx.products.update.mock.calls[0] as [
        { data: Record<string, unknown> },
      ];
      expect(updateArg.data).not.toHaveProperty("available_stock");
    });

    it("es idempotente ante una redelivery: la reserva ya cerrada se omite", async () => {
      const tx = buildTx();
      tx.stock_reservations.findMany.mockResolvedValue([reservation]);
      tx.stock_reservations.updateMany.mockResolvedValue({ count: 0 });
      prisma.$transaction.mockImplementation(
        async (cb: (tx: TxMock) => Promise<unknown>) => cb(tx),
      );

      await repository.consumeStock("o1");

      expect(tx.products.update).not.toHaveBeenCalled();
    });

    it("no toca nada cuando la orden no tiene reservas activas", async () => {
      const tx = buildTx();
      tx.stock_reservations.findMany.mockResolvedValue([]);
      prisma.$transaction.mockImplementation(
        async (cb: (tx: TxMock) => Promise<unknown>) => cb(tx),
      );

      await repository.consumeStock("o1");

      expect(tx.stock_reservations.updateMany).not.toHaveBeenCalled();
      expect(tx.products.update).not.toHaveBeenCalled();
    });

    it("loguea y propaga el error cuando la transaccion falla", async () => {
      prisma.$transaction.mockRejectedValue(new Error("db down"));

      await expect(repository.consumeStock("o1")).rejects.toMatchObject({
        error: { code: 13 },
      });
      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
