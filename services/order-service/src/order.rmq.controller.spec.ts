import { Test, TestingModule } from "@nestjs/testing";
import { OrderEventController } from "./order.rmq.controller";
import { CancelOrderService } from "./services/CancelOrder.service";
import { ConfirmOrderService } from "./services/ConfirmOrder.service";

describe("OrderEventController", () => {
  let controller: OrderEventController;
  let cancelOrderService: { execute: jest.Mock };
  let confirmOrderService: { execute: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderEventController],
      providers: [
        { provide: CancelOrderService, useValue: { execute: jest.fn() } },
        { provide: ConfirmOrderService, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    controller = module.get<OrderEventController>(OrderEventController);
    cancelOrderService = module.get<{ execute: jest.Mock }>(CancelOrderService);
    confirmOrderService = module.get<{ execute: jest.Mock }>(
      ConfirmOrderService,
    );
  });

  describe("stock.reject", () => {
    it("cancela la orden con el orderId del payload", async () => {
      cancelOrderService.execute.mockResolvedValue(undefined);

      const result = await controller.handleStockRejected({
        orderId: "o1",
        reason: "PRODUCT_NOT_FOUND",
      });

      expect(result).toBeUndefined();
      expect(cancelOrderService.execute).toHaveBeenCalledWith("o1");
      expect(cancelOrderService.execute).toHaveBeenCalledTimes(1);
      expect(confirmOrderService.execute).not.toHaveBeenCalled();
    });

    it("propaga el error cuando el servicio falla", async () => {
      const error = new Error("cancel error");
      cancelOrderService.execute.mockRejectedValue(error);

      await expect(
        controller.handleStockRejected({
          orderId: "o1",
          reason: "PRODUCT_NOT_FOUND",
        }),
      ).rejects.toThrow(error);
    });
  });

  describe("payment.approved", () => {
    it("confirma la orden con el orderId del payload", async () => {
      confirmOrderService.execute.mockResolvedValue(undefined);

      const result = await controller.handlePaymentApproved({ orderId: "o2" });

      expect(result).toBeUndefined();
      expect(confirmOrderService.execute).toHaveBeenCalledWith("o2");
      expect(confirmOrderService.execute).toHaveBeenCalledTimes(1);
      expect(cancelOrderService.execute).not.toHaveBeenCalled();
    });

    it("propaga el error cuando el servicio falla", async () => {
      const error = new Error("confirm error");
      confirmOrderService.execute.mockRejectedValue(error);

      await expect(
        controller.handlePaymentApproved({ orderId: "o2" }),
      ).rejects.toThrow(error);
    });
  });

  describe("payment.failed", () => {
    it("cancela la orden con el orderId del payload", async () => {
      cancelOrderService.execute.mockResolvedValue(undefined);

      const result = await controller.handlePaymentFailed({ orderId: "o2" });

      expect(result).toBeUndefined();
      expect(cancelOrderService.execute).toHaveBeenCalledWith("o2");
      expect(cancelOrderService.execute).toHaveBeenCalledTimes(1);
      expect(confirmOrderService.execute).not.toHaveBeenCalled();
    });

    it("propaga el error cuando el servicio falla", async () => {
      const error = new Error("cancel error");
      cancelOrderService.execute.mockRejectedValue(error);

      await expect(
        controller.handlePaymentFailed({ orderId: "o2" }),
      ).rejects.toThrow(error);
    });
  });
});
