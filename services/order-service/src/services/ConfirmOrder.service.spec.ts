import { Test, TestingModule } from "@nestjs/testing";
import { ConfirmOrderService } from "./ConfirmOrder.service";
import { OrderRepository } from "../Repository/order.repository";

describe("ConfirmOrderService", () => {
  let service: ConfirmOrderService;
  let orderRepository: { updateStatusIfPending: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfirmOrderService,
        {
          provide: OrderRepository,
          useValue: { updateStatusIfPending: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ConfirmOrderService>(ConfirmOrderService);
    orderRepository = module.get<{ updateStatusIfPending: jest.Mock }>(
      OrderRepository,
    );
  });

  describe("execute", () => {
    it("confirma la orden pidiendo la transición solo si está PENDING", async () => {
      orderRepository.updateStatusIfPending.mockResolvedValue(true);

      const result = await service.execute("o1");

      expect(result).toBe(true);
      expect(orderRepository.updateStatusIfPending).toHaveBeenCalledWith(
        "o1",
        "CONFIRMED",
      );
      expect(orderRepository.updateStatusIfPending).toHaveBeenCalledTimes(1);
    });

    it("propaga el false cuando la orden ya estaba cancelada", async () => {
      orderRepository.updateStatusIfPending.mockResolvedValue(false);

      const result = await service.execute("o1");

      expect(result).toBe(false);
    });

    it("propaga el error cuando el repositorio falla", async () => {
      const error = new Error("db down");
      orderRepository.updateStatusIfPending.mockRejectedValue(error);

      await expect(service.execute("o1")).rejects.toThrow(error);
    });
  });
});
