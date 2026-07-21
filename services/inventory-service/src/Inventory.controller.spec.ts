import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ProductsRepository } from "./products.repository";
import { PgService } from "./Pg.service";

describe("AppController", () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: ProductsRepository,
          useValue: { findAll: jest.fn() },
        },
        {
          provide: PgService,
          useValue: {},
        },
      ],
    }).compile();

    appController = module.get(AppController);
    appService = module.get(AppService);
  });

  describe("inventory.get", () => {
    it("should return products from service", async () => {
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
      jest.spyOn(appService, "getProducts").mockResolvedValue(products);

      const result = await appController.getProducts({ limit: 10, offset: 0 });
      expect(result).toEqual(products);
      expect(appService.getProducts).toHaveBeenCalledWith(10, 0);
    });

    it("should use defaults when no payload provided", async () => {
      jest.spyOn(appService, "getProducts").mockResolvedValue([]);

      await appController.getProducts({});
      expect(appService.getProducts).toHaveBeenCalledWith(undefined, undefined);
    });
  });
});
