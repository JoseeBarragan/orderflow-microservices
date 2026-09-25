import { Test, TestingModule } from "@nestjs/testing";
import { PaymentGrpcController } from "./payment.grpc.controller";
import { ConfirmPaymentService } from "./services/ConfirmPayment.service";

describe("PaymentGrpcController", () => {
  let controller: PaymentGrpcController;
  let confirmPaymentService: { execute: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentGrpcController],
      providers: [
        { provide: ConfirmPaymentService, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    controller = module.get<PaymentGrpcController>(PaymentGrpcController);
    confirmPaymentService = module.get<{ execute: jest.Mock }>(
      ConfirmPaymentService,
    );
  });

  describe("confirmPayment", () => {
    it("delega la confirmación al ConfirmPaymentService con el orderId", async () => {
      confirmPaymentService.execute.mockResolvedValue({ status: "APPROVED" });

      const result = await controller.confirmPayment({ orderId: "o1" });

      expect(result).toEqual({ status: "APPROVED" });
      expect(confirmPaymentService.execute).toHaveBeenCalledWith("o1");
      expect(confirmPaymentService.execute).toHaveBeenCalledTimes(1);
    });

    it("propaga el error cuando el servicio falla", async () => {
      const error = new Error("payment error");
      confirmPaymentService.execute.mockRejectedValue(error);

      await expect(
        controller.confirmPayment({ orderId: "o1" }),
      ).rejects.toThrow(error);
    });
  });
});
