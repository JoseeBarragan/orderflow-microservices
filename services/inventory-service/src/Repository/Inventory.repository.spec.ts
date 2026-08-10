import { Test, TestingModule } from "@nestjs/testing";
import { InternalServerErrorException, Logger } from "@nestjs/common";
import { InventoryRepository } from "./Inventory.repository";
import { PrismaService } from "../prisma.service";

describe("InventoryRepository", () => {
  let repository: InventoryRepository;
  let prisma: { products: { findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      products: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<InventoryRepository>(InventoryRepository);
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("findAll", () => {
    it("busca productos con take, skip y orden desc por created_at", async () => {
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
      prisma.products.findMany.mockResolvedValue(products);

      const result = await repository.findAll(10, 20);

      expect(result).toEqual(products);
      expect(prisma.products.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 20,
        orderBy: { created_at: "desc" },
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

    it("lanza InternalServerErrorException cuando prisma falla", async () => {
      prisma.products.findMany.mockRejectedValue(new Error("db down"));

      await expect(repository.findAll()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe("findByIds", () => {
    it("busca productos cuyo id esté en la lista", async () => {
      const products = [
        { id: "p1", name: "A" },
        { id: "p2", name: "B" },
      ];
      prisma.products.findMany.mockResolvedValue(products);

      const result = await repository.findByIds(["p1", "p2"]);

      expect(result).toEqual(products);
      expect(prisma.products.findMany).toHaveBeenCalledWith({
        where: { id: { in: ["p1", "p2"] } },
      });
    });

    it("lanza InternalServerErrorException cuando prisma falla", async () => {
      prisma.products.findMany.mockRejectedValue(new Error("db down"));

      await expect(repository.findByIds(["p1"])).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
