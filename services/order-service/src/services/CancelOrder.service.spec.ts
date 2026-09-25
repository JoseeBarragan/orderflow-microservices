import { Test, TestingModule } from "@nestjs/testing";
import { CancelOrderService } from "./CancelOrder.service";
import { OrderRepository } from "../Repository/order.repository";

describe("CancelOrderService", () => {
  let service: CancelOrderService;
  let orderRepository: { updateStatusOrder: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CancelOrderService,
        {
          provide: OrderRepository,
          useValue: { updateStatusOrder: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CancelOrderService>(CancelOrderService);
    orderRepository = module.get<{ updateStatusOrder: jest.Mock }>(
      OrderRepository,
    );
  });

  describe("execute", () => {
    it("cancela la orden actualizando su estado a CANCELLED", async () => {
      const updated = { orderId: "o1", status: "CANCELLED" };
      orderRepository.updateStatusOrder.mockResolvedValue(updated);

      const result = await service.execute("o1");

      expect(result).toEqual(updated);
      expect(orderRepository.updateStatusOrder).toHaveBeenCalledWith(
        "o1",
        "CANCELLED",
      );
      expect(orderRepository.updateStatusOrder).toHaveBeenCalledTimes(1);
    });

    it("propaga el error cuando el repositorio falla", async () => {
      const error = new Error("db down");
      orderRepository.updateStatusOrder.mockRejectedValue(error);

      await expect(service.execute("o1")).rejects.toThrow(error);
    });
  });
});
