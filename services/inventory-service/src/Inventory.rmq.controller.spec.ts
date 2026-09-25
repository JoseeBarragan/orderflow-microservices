import { Test, TestingModule } from "@nestjs/testing";
import { InventoryRmqController } from "./Inventory.rmq.controller";
import { ReserveStockService } from "./services/ReserveStock.service";
import { ReleaseStockService } from "./services/ReleaseStock.service";
import { ConsumeStockService } from "./services/ConsumeStock.service";
import type { NewOrder } from "./types/Inventory.types";

describe("InventoryRmqController", () => {
  let controller: InventoryRmqController;
  let reserveStockService: { execute: jest.Mock };
  let releaseStockService: { execute: jest.Mock };
  let consumeStockService: { execute: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryRmqController],
      providers: [
        { provide: ReserveStockService, useValue: { execute: jest.fn() } },
        { provide: ReleaseStockService, useValue: { execute: jest.fn() } },
        { provide: ConsumeStockService, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    controller = module.get<InventoryRmqController>(InventoryRmqController);
    reserveStockService = module.get<{ execute: jest.Mock }>(
      ReserveStockService,
    );
    releaseStockService = module.get<{ execute: jest.Mock }>(
      ReleaseStockService,
    );
    consumeStockService = module.get<{ execute: jest.Mock }>(
      ConsumeStockService,
    );
  });

  describe("reserveStock", () => {
    const order: NewOrder = {
      orderId: "3278373d-174f-467a-aaa5-82fc9957a6bf",
      totalAmount: 3000,
      items: [
        { productId: "p1", quantity: 2, unitPrice: 1500 },
        { productId: "p2", quantity: 1, unitPrice: 1000 },
      ],
    };

    it("delega el payload de order.created a ReserveStockService.execute", async () => {
      reserveStockService.execute.mockResolvedValue(undefined);

      const result = await controller.reserveStock(order);

      expect(reserveStockService.execute).toHaveBeenCalledWith(order);
      expect(reserveStockService.execute).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
      expect(releaseStockService.execute).not.toHaveBeenCalled();
    });

    it("devuelve lo que devuelve el servicio", async () => {
      reserveStockService.execute.mockResolvedValue({ rejected: true });

      const result = await controller.reserveStock(order);

      expect(result).toEqual({ rejected: true });
    });

    it("propaga el error cuando el servicio falla", async () => {
      const error = new Error("db down");
      reserveStockService.execute.mockRejectedValue(error);

      await expect(controller.reserveStock(order)).rejects.toThrow(error);
    });
  });

  describe("releaseStock", () => {
    it("delega solo el orderId de payment.failed a ReleaseStockService.execute", async () => {
      releaseStockService.execute.mockResolvedValue(undefined);

      const result = await controller.releaseStock({ orderId: "o1" });

      expect(releaseStockService.execute).toHaveBeenCalledWith("o1");
      expect(releaseStockService.execute).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
      expect(reserveStockService.execute).not.toHaveBeenCalled();
    });

    it("devuelve lo que devuelve el servicio", async () => {
      releaseStockService.execute.mockResolvedValue({ released: 2 });

      const result = await controller.releaseStock({ orderId: "o1" });

      expect(result).toEqual({ released: 2 });
    });

    it("propaga el error cuando el servicio falla", async () => {
      const error = new Error("release error");
      releaseStockService.execute.mockRejectedValue(error);

      await expect(controller.releaseStock({ orderId: "o1" })).rejects.toThrow(
        error,
      );
    });
  });
  describe("releaseStockOnOrderCancelled", () => {
    it("delega solo el orderId de order.cancelled a ReleaseStockService.execute", async () => {
      releaseStockService.execute.mockResolvedValue(undefined);

      const result = await controller.releaseStockOnOrderCancelled({
        orderId: "o1",
      });

      expect(releaseStockService.execute).toHaveBeenCalledWith("o1");
      expect(releaseStockService.execute).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
      expect(consumeStockService.execute).not.toHaveBeenCalled();
    });

    it("propaga el error cuando el servicio falla", async () => {
      const error = new Error("release error");
      releaseStockService.execute.mockRejectedValue(error);

      await expect(
        controller.releaseStockOnOrderCancelled({ orderId: "o1" }),
      ).rejects.toThrow(error);
    });
  });

  describe("consumeStock", () => {
    it("delega solo el orderId de payment.approved a ConsumeStockService.execute", async () => {
      consumeStockService.execute.mockResolvedValue(undefined);

      const result = await controller.consumeStock({ orderId: "o1" });

      expect(consumeStockService.execute).toHaveBeenCalledWith("o1");
      expect(consumeStockService.execute).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
      expect(releaseStockService.execute).not.toHaveBeenCalled();
    });

    it("devuelve lo que devuelve el servicio", async () => {
      consumeStockService.execute.mockResolvedValue({ consumed: 2 });

      const result = await controller.consumeStock({ orderId: "o1" });

      expect(result).toEqual({ consumed: 2 });
    });

    it("propaga el error cuando el servicio falla", async () => {
      const error = new Error("consume error");
      consumeStockService.execute.mockRejectedValue(error);

      await expect(controller.consumeStock({ orderId: "o1" })).rejects.toThrow(
        error,
      );
    });
  });
});
