import { Test, TestingModule } from "@nestjs/testing";
import { CreatePaymentService } from "./CreatePayment.service";
import { PaymentRepository } from "../Repository/payment.repository";

describe("CreatePaymentService", () => {
  let service: CreatePaymentService;
  let paymentRepository: { createPayment: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatePaymentService,
        { provide: PaymentRepository, useValue: { createPayment: jest.fn() } },
      ],
    }).compile();

    service = module.get<CreatePaymentService>(CreatePaymentService);
    paymentRepository = module.get<{ createPayment: jest.Mock }>(
      PaymentRepository,
    );
  });

  describe("execute", () => {
    it("delega la creación del pago al repositorio con orderId y totalAmount", async () => {
      const created = { id: "pay-1", orderId: "o1", totalAmount: 3000 };
      paymentRepository.createPayment.mockResolvedValue(created);

      const result = await service.execute("o1", 3000);

      expect(result).toEqual(created);
      expect(paymentRepository.createPayment).toHaveBeenCalledWith("o1", 3000);
      expect(paymentRepository.createPayment).toHaveBeenCalledTimes(1);
    });

    it("propaga el error cuando el repositorio falla", async () => {
      const error = new Error("db down");
      paymentRepository.createPayment.mockRejectedValue(error);

      await expect(service.execute("o1", 3000)).rejects.toThrow(error);
    });
  });
});
