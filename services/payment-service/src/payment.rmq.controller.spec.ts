import { Logger } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PaymentEventController } from "./payment.rmq.controller";
import { CreatePaymentService } from "./services/CreatePayment.service";
import type { StockReservedPayload } from "./types/payment.types";

describe("PaymentEventController", () => {
  let controller: PaymentEventController;
  let createPaymentService: { execute: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentEventController],
      providers: [
        { provide: CreatePaymentService, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    controller = module.get<PaymentEventController>(PaymentEventController);
    createPaymentService = module.get<{ execute: jest.Mock }>(
      CreatePaymentService,
    );
  });

  const payload: StockReservedPayload = {
    orderId: "3278373d-174f-467a-aaa5-82fc9957a6bf",
    totalAmount: 3000,
    items: [{ productId: "p1", quantity: 2, unitPrice: 1500 }],
  };

  describe("stock.reserve", () => {
    it("delega la creación del pago al CreatePaymentService con orderId y totalAmount", async () => {
      const created = {
        id: "pay-1",
        orderId: payload.orderId,
        totalAmount: 3000,
      };
      createPaymentService.execute.mockResolvedValue(created);

      const result = await controller.createPayment(payload);

      expect(result).toEqual(created);
      expect(createPaymentService.execute).toHaveBeenCalledWith(
        payload.orderId,
        payload.totalAmount,
      );
      expect(createPaymentService.execute).toHaveBeenCalledTimes(1);
    });

    it("loguea el error y lo relanza cuando el servicio falla", async () => {
      const error = new Error("payment error");
      createPaymentService.execute.mockRejectedValue(error);
      const errorSpy = jest
        .spyOn(Logger.prototype, "error")
        .mockImplementation(() => undefined);

      await expect(controller.createPayment(payload)).rejects.toThrow(error);
      expect(errorSpy).toHaveBeenCalledWith(`Error: payment error`);

      errorSpy.mockRestore();
    });
  });
});
