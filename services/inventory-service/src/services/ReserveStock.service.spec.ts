import { Test, TestingModule } from "@nestjs/testing";
import { ReserveStockService } from "./ReserveStock.service";
import { InventoryRepository } from "../Inventory.repository";
import { NewOrder } from "../Inventory.types";

describe("ReserveStockService", () => {
  let service: ReserveStockService;
  let inventoryRepository: { findByIds: jest.Mock };
  let rabbitmq: { emit: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReserveStockService,
        {
          provide: InventoryRepository,
          useValue: { findAll: jest.fn(), findByIds: jest.fn() },
        },
        { provide: "RMQ_CLIENT", useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<ReserveStockService>(ReserveStockService);
    inventoryRepository = module.get<{ findByIds: jest.Mock }>(
      InventoryRepository,
    );
    rabbitmq = module.get<{ emit: jest.Mock }>("RMQ_CLIENT");
  });

  const order: NewOrder = {
    items: [
      { productId: "p1", quantity: 2, unitPrice: 1500 },
      { productId: "p2", quantity: 1, unitPrice: 1000 },
    ],
  };

  describe("execute", () => {
    it("busca los productos por id y no emite nada cuando todos existen", async () => {
      inventoryRepository.findByIds.mockResolvedValue([
        { id: "p1", name: "A" },
        { id: "p2", name: "B" },
      ]);

      await service.execute(order);

      expect(inventoryRepository.findByIds).toHaveBeenCalledWith(["p1", "p2"]);
      expect(rabbitmq.emit).not.toHaveBeenCalled();
    });

    it("emite stock.rejected cuando faltan productos", async () => {
      inventoryRepository.findByIds.mockResolvedValue([
        { id: "p1", name: "A" },
      ]);

      await service.execute(order);

      expect(rabbitmq.emit).toHaveBeenCalledWith(
        "stock.rejected",
        "Invalid product on the order",
      );
      expect(rabbitmq.emit).toHaveBeenCalledTimes(1);
    });

    it("emite stock.rejected cuando no se encuentra ningún producto", async () => {
      inventoryRepository.findByIds.mockResolvedValue([]);

      await service.execute(order);

      expect(rabbitmq.emit).toHaveBeenCalledWith(
        "stock.rejected",
        "Invalid product on the order",
      );
    });

    it("propaga el error cuando el repositorio falla", async () => {
      const error = new Error("db down");
      inventoryRepository.findByIds.mockRejectedValue(error);

      await expect(service.execute(order)).rejects.toThrow(error);
    });
  });
});
