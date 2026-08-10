import { Test, TestingModule } from "@nestjs/testing";
import { GetAllProductsService } from "./GetAllProducts.service";
import { InventoryRepository } from "../Repository/Inventory.repository";

describe("GetAllProductsService", () => {
  let service: GetAllProductsService;
  let productsRepository: { findAll: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllProductsService,
        {
          provide: InventoryRepository,
          useValue: { findAll: jest.fn(), findByIds: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<GetAllProductsService>(GetAllProductsService);
    productsRepository = module.get<{ findAll: jest.Mock }>(
      InventoryRepository,
    );
  });

  describe("getProducts", () => {
    it("delega al repositorio con los límites indicados", async () => {
      const products = [
        {
          id: "1",
          name: "Test",
          available_stock: 10,
          reserved_stock: 0,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];
      productsRepository.findAll.mockResolvedValue(products);

      const result = await service.getProducts(10, 20);

      expect(result).toEqual(products);
      expect(productsRepository.findAll).toHaveBeenCalledWith(10, 20);
      expect(productsRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it("usa los defaults 50 y 0 cuando no recibe argumentos", async () => {
      productsRepository.findAll.mockResolvedValue([]);

      await service.getProducts();

      expect(productsRepository.findAll).toHaveBeenCalledWith(50, 0);
    });

    it("usa el limit pasado pero el offset por defecto", async () => {
      productsRepository.findAll.mockResolvedValue([]);

      await service.getProducts(25);

      expect(productsRepository.findAll).toHaveBeenCalledWith(25, 0);
    });

    it("propaga el error cuando el repositorio falla", async () => {
      const error = new Error("db down");
      productsRepository.findAll.mockRejectedValue(error);

      await expect(service.getProducts()).rejects.toThrow(error);
    });
  });
});
