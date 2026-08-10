import { InternalServerErrorException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ReserveStockService } from "./ReserveStock.service";
import { InventoryRepository } from "../Repository/Inventory.repository";
import { OutboxRepository } from "../Repository/Outbox.repository";
import type { NewOrder } from "../types/Inventory.types";

describe("ReserveStockService", () => {
  let service: ReserveStockService;
  let inventoryRepository: {
    findByIds: jest.Mock;
    reserveStock: jest.Mock;
  };
  let outboxRepository: { save: jest.Mock };

  beforeEach(async () => {
    inventoryRepository = {
      findByIds: jest.fn(),
      reserveStock: jest.fn(),
    };
    outboxRepository = { save: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReserveStockService,
        { provide: InventoryRepository, useValue: inventoryRepository },
        { provide: OutboxRepository, useValue: outboxRepository },
      ],
    }).compile();

    service = module.get<ReserveStockService>(ReserveStockService);
  });

  const order: NewOrder = {
    orderId: "o1",
    totalAmount: 3000,
    items: [
      { productId: "p1", quantity: 2, unitPrice: 1500 },
      { productId: "p2", quantity: 1, unitPrice: 1000 },
    ],
  };

  describe("execute", () => {
    it("reserva el stock y emite stock.reserve cuando todos los productos existen y hay stock", async () => {
      inventoryRepository.findByIds.mockResolvedValue([
        { id: "p1", name: "A" },
        { id: "p2", name: "B" },
      ]);
      inventoryRepository.reserveStock.mockResolvedValue({ success: true });

      await service.execute(order);

      expect(inventoryRepository.findByIds).toHaveBeenCalledWith(["p1", "p2"]);
      expect(inventoryRepository.reserveStock).toHaveBeenCalledWith(order);
      expect(outboxRepository.save).toHaveBeenCalledWith("stock.reserve", {
        orderId: order.orderId,
        items: order.items,
        totalAmount: order.totalAmount,
      });
      expect(outboxRepository.save).toHaveBeenCalledTimes(1);
    });

    it("emite stock.reject con reason PRODUCT_NOT_FOUND cuando faltan productos", async () => {
      inventoryRepository.findByIds.mockResolvedValue([
        { id: "p1", name: "A" },
      ]);
      inventoryRepository.reserveStock.mockResolvedValue({ success: true });

      await service.execute(order);

      expect(inventoryRepository.reserveStock).not.toHaveBeenCalled();
      expect(outboxRepository.save).toHaveBeenCalledWith("stock.reject", {
        orderId: order.orderId,
        reason: "PRODUCT_NOT_FOUND",
      });
      expect(outboxRepository.save).toHaveBeenCalledTimes(1);
    });

    it("emite stock.reject con reason PRODUCT_NOT_FOUND cuando no se encuentra ningún producto", async () => {
      inventoryRepository.findByIds.mockResolvedValue([]);

      await service.execute(order);

      expect(inventoryRepository.reserveStock).not.toHaveBeenCalled();
      expect(outboxRepository.save).toHaveBeenCalledWith("stock.reject", {
        orderId: order.orderId,
        reason: "PRODUCT_NOT_FOUND",
      });
    });

    it("emite stock.reject con el reason del resultado cuando reserveStock falla por stock", async () => {
      inventoryRepository.findByIds.mockResolvedValue([
        { id: "p1", name: "A" },
        { id: "p2", name: "B" },
      ]);
      inventoryRepository.reserveStock.mockResolvedValue({
        success: false,
        reason: "Stock insuficiente para producto p1",
      });

      await service.execute(order);

      expect(outboxRepository.save).toHaveBeenCalledWith("stock.reject", {
        orderId: order.orderId,
        reason: "Stock insuficiente para producto p1",
      });
      expect(outboxRepository.save).toHaveBeenCalledTimes(1);
    });

    it("propaga el error cuando el repositorio falla con una excepción", async () => {
      const error = new InternalServerErrorException("db down");
      inventoryRepository.findByIds.mockRejectedValue(error);

      await expect(service.execute(order)).rejects.toThrow(error);
      expect(outboxRepository.save).not.toHaveBeenCalled();
    });
  });
});
