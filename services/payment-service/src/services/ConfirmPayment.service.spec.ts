import { RpcException } from "@nestjs/microservices";
import { status } from "@grpc/grpc-js";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfirmPaymentService } from "./ConfirmPayment.service";
import { PaymentRepository } from "../Repository/payment.repository";
import { PaymentNotFoundError } from "../types/Error.type";

describe("ConfirmPaymentService", () => {
  let service: ConfirmPaymentService;
  let paymentRepository: { confirmPayment: jest.Mock };
  let randomSpy: jest.SpyInstance<number, []>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfirmPaymentService,
        { provide: PaymentRepository, useValue: { confirmPayment: jest.fn() } },
      ],
    }).compile();

    service = module.get<ConfirmPaymentService>(ConfirmPaymentService);
    paymentRepository = module.get<{ confirmPayment: jest.Mock }>(
      PaymentRepository,
    );
    randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.1);
  });

  afterEach(() => {
    randomSpy.mockRestore();
  });

  describe("execute", () => {
    it("confirma el pago como APPROVED y emite payment.approved cuando el resultado es exitoso", async () => {
      randomSpy.mockReturnValue(0.1);
      paymentRepository.confirmPayment.mockResolvedValue({ orderId: "o1" });

      const result = await service.execute("o1");

      expect(result).toEqual({ status: "APPROVED" });
      expect(paymentRepository.confirmPayment).toHaveBeenCalledWith(
        "o1",
        "APPROVED",
        "payment.approved",
        { orderId: "o1" },
      );
      expect(paymentRepository.confirmPayment).toHaveBeenCalledTimes(1);
    });

    it("marca el pago como FAILED y emite payment.failed cuando el resultado no es exitoso", async () => {
      randomSpy.mockReturnValue(0.9);
      paymentRepository.confirmPayment.mockResolvedValue({ orderId: "o1" });

      const result = await service.execute("o1");

      expect(result).toEqual({ status: "FAILED" });
      expect(paymentRepository.confirmPayment).toHaveBeenCalledWith(
        "o1",
        "FAILED",
        "payment.failed",
        { orderId: "o1" },
      );
    });

    it("lanza RpcException NOT_FOUND cuando el repositorio lanza PaymentNotFoundError", async () => {
      paymentRepository.confirmPayment.mockRejectedValue(
        new PaymentNotFoundError("o1"),
      );

      await expect(service.execute("o1")).rejects.toBeInstanceOf(RpcException);
      await expect(service.execute("o1")).rejects.toMatchObject({
        error: {
          code: status.NOT_FOUND,
          message: "Payment para la orden o1 no encontrado",
        },
      });
    });

    it("lanza RpcException INTERNAL cuando el repositorio falla con otro error", async () => {
      paymentRepository.confirmPayment.mockRejectedValue(new Error("boom"));

      await expect(service.execute("o1")).rejects.toBeInstanceOf(RpcException);
      await expect(service.execute("o1")).rejects.toMatchObject({
        error: {
          code: status.INTERNAL,
          message: "Error interno al confirmar el pago",
        },
      });
    });
  });
});
