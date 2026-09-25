import { Test, TestingModule } from "@nestjs/testing";
import { GetAllOrdersService } from "./GetAllOrders.service";
import { OrderRepository } from "../Repository/order.repository";

describe("GetAllOrdersService", () => {
  let service: GetAllOrdersService;
  let orderRepository: { getAll: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllOrdersService,
        { provide: OrderRepository, useValue: { getAll: jest.fn() } },
      ],
    }).compile();

    service = module.get<GetAllOrdersService>(GetAllOrdersService);
    orderRepository = module.get<{ getAll: jest.Mock }>(OrderRepository);
  });

  describe("execute", () => {
    it("delega la obtención de órdenes al repositorio", async () => {
      const orders = {
        orders: [
          { orderId: "o1", totalAmount: 1000, items: [] },
          { orderId: "o2", totalAmount: 2000, items: [] },
        ],
      };
      orderRepository.getAll.mockResolvedValue(orders);

      const result = await service.execute();

      expect(result).toEqual(orders);
      expect(orderRepository.getAll).toHaveBeenCalledTimes(1);
    });

    it("propaga el error cuando el repositorio falla", async () => {
      const error = new Error("db down");
      orderRepository.getAll.mockRejectedValue(error);

      await expect(service.execute()).rejects.toThrow(error);
    });
  });
});
