import { Test, TestingModule } from "@nestjs/testing";
import { InventoryController } from "./Inventory.controller";
import { GetAllProductsService } from "./services/GetAllProducts.service";
import { ReserveStockService } from "./services/ReserveStock.service";
import { NewOrder } from "./Inventory.types";

describe("InventoryController", () => {
  let controller: InventoryController;
  let getAllProductsService: { getProducts: jest.Mock };
  let reserveStockService: { execute: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: GetAllProductsService,
          useValue: { getProducts: jest.fn() },
        },
        {
          provide: ReserveStockService,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
    getAllProductsService = module.get<{ getProducts: jest.Mock }>(
      GetAllProductsService,
    );
    reserveStockService = module.get<{ execute: jest.Mock }>(
      ReserveStockService,
    );
  });

  describe("inventory.get", () => {
    it("delega al servicio con el limit y offset del payload", async () => {
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
      getAllProductsService.getProducts.mockResolvedValue(products);

      const result = await controller.getProducts({ limit: 10, offset: 0 });

      expect(result).toEqual(products);
      expect(getAllProductsService.getProducts).toHaveBeenCalledWith(10, 0);
      expect(getAllProductsService.getProducts).toHaveBeenCalledTimes(1);
    });

    it("pasa undefined cuando el payload no trae limit/offset", async () => {
      getAllProductsService.getProducts.mockResolvedValue([]);

      await controller.getProducts({});

      expect(getAllProductsService.getProducts).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
    });

    it("tolera payload undefined", async () => {
      getAllProductsService.getProducts.mockResolvedValue([]);

      await controller.getProducts(undefined as never);

      expect(getAllProductsService.getProducts).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
    });

    it("propaga el error cuando el servicio falla", async () => {
      const error = new Error("db down");
      getAllProductsService.getProducts.mockRejectedValue(error);

      await expect(controller.getProducts({})).rejects.toThrow(error);
    });
  });

  describe("order.created", () => {
    it("delega la reserva de stock al ReserveStockService con el payload", async () => {
      const order: NewOrder = {
        items: [
          {
            productId: "3278373d-174f-467a-aaa5-82fc9957a6bf",
            quantity: 2,
            unitPrice: 1500,
          },
        ],
      };
      reserveStockService.execute.mockResolvedValue(undefined);

      const result = await controller.reserveStock(order);

      expect(result).toBeUndefined();
      expect(reserveStockService.execute).toHaveBeenCalledWith(order);
      expect(reserveStockService.execute).toHaveBeenCalledTimes(1);
    });

    it("propaga el error cuando el servicio falla", async () => {
      const error = new Error("stock error");
      reserveStockService.execute.mockRejectedValue(error);

      await expect(controller.reserveStock({ items: [] })).rejects.toThrow(
        error,
      );
    });
  });
});
