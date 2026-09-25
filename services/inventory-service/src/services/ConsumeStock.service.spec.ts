import { Test, TestingModule } from "@nestjs/testing";
import { ConsumeStockService } from "./ConsumeStock.service";
import { InventoryRepository } from "src/Repository/Inventory.repository";

describe("ConsumeStockService", () => {
  let service: ConsumeStockService;
  let inventoryRepository: { consumeStock: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsumeStockService,
        { provide: InventoryRepository, useValue: { consumeStock: jest.fn() } },
      ],
    }).compile();

    service = module.get<ConsumeStockService>(ConsumeStockService);
    inventoryRepository = module.get<{ consumeStock: jest.Mock }>(
      InventoryRepository,
    );
  });

  it("delega el orderId al repositorio", async () => {
    inventoryRepository.consumeStock.mockResolvedValue(undefined);

    const result = await service.execute("o1");

    expect(inventoryRepository.consumeStock).toHaveBeenCalledWith("o1");
    expect(inventoryRepository.consumeStock).toHaveBeenCalledTimes(1);
    expect(result).toBeUndefined();
  });

  it("devuelve lo que devuelve el repositorio", async () => {
    inventoryRepository.consumeStock.mockResolvedValue({ done: true });

    const result = await service.execute("o1");

    expect(result).toEqual({ done: true });
  });

  it("propaga el error cuando el repositorio falla", async () => {
    const error = new Error("db down");
    inventoryRepository.consumeStock.mockRejectedValue(error);

    await expect(service.execute("o1")).rejects.toThrow(error);
  });
});
