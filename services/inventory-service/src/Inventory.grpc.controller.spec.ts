import { Test, TestingModule } from "@nestjs/testing";
import { InventoryGrpcController } from "./Inventory.grpc.controller";
import { GetAllProductsService } from "./services/GetAllProducts.service";

describe("InventoryGrpcController", () => {
  let controller: InventoryGrpcController;
  let getAllProductsService: { getProducts: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryGrpcController],
      providers: [
        {
          provide: GetAllProductsService,
          useValue: { getProducts: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<InventoryGrpcController>(InventoryGrpcController);
    getAllProductsService = module.get<{ getProducts: jest.Mock }>(
      GetAllProductsService,
    );
  });

  describe("getAll", () => {
    it("delega al servicio con el limit y offset del payload", async () => {
      const items = [
        { id: "1", name: "Test", unitPriceCents: 150000, availableStock: 10 },
      ];
      getAllProductsService.getProducts.mockResolvedValue({ items });

      const result = await controller.getAll({ limit: 10, offset: 20 });

      expect(result).toEqual({ items });
      expect(getAllProductsService.getProducts).toHaveBeenCalledWith(10, 20);
      expect(getAllProductsService.getProducts).toHaveBeenCalledTimes(1);
    });

    it("pasa undefined cuando el payload no trae limit/offset", async () => {
      getAllProductsService.getProducts.mockResolvedValue({ items: [] });

      await controller.getAll({});

      expect(getAllProductsService.getProducts).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
    });

    it("tolera payload undefined", async () => {
      getAllProductsService.getProducts.mockResolvedValue({ items: [] });

      await controller.getAll(undefined as never);

      expect(getAllProductsService.getProducts).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
    });

    it("propaga el error cuando el servicio falla", async () => {
      const error = new Error("db down");
      getAllProductsService.getProducts.mockRejectedValue(error);

      await expect(controller.getAll({})).rejects.toThrow(error);
    });
  });
});
