import { Test, TestingModule } from "@nestjs/testing";
import { ReleaseStockService } from "./ReleaseStock.service";
import { InventoryRepository } from "../Repository/Inventory.repository";

describe("ReleaseStockService", () => {
  let service: ReleaseStockService;
  let inventoryRepository: { releaseStock: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReleaseStockService,
        { provide: InventoryRepository, useValue: { releaseStock: jest.fn() } },
      ],
    }).compile();

    service = module.get<ReleaseStockService>(ReleaseStockService);
    inventoryRepository = module.get<{ releaseStock: jest.Mock }>(
      InventoryRepository,
    );
  });

  describe("execute", () => {
    it("delega la liberación de stock al repositorio con el orderId", async () => {
      inventoryRepository.releaseStock.mockResolvedValue(undefined);

      const result = await service.execute("o1");

      expect(result).toBeUndefined();
      expect(inventoryRepository.releaseStock).toHaveBeenCalledWith("o1");
      expect(inventoryRepository.releaseStock).toHaveBeenCalledTimes(1);
    });

    it("devuelve el resultado del repositorio", async () => {
      const released = { count: 2 };
      inventoryRepository.releaseStock.mockResolvedValue(released);

      const result = await service.execute("o1");

      expect(result).toEqual(released);
    });

    it("propaga el error cuando el repositorio falla", async () => {
      const error = new Error("db down");
      inventoryRepository.releaseStock.mockRejectedValue(error);

      await expect(service.execute("o1")).rejects.toThrow(error);
    });
  });
});
