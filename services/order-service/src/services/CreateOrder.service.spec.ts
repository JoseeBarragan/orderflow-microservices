import { Test, TestingModule } from "@nestjs/testing";
import { CreateOrderService } from "./CreateOrder.service";
import { OrderRepository } from "../Repository/order.repository";
import type { OrderItems } from "../types/order.entity";

describe("CreateOrderService", () => {
  let service: CreateOrderService;
  let orderRepository: { create: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOrderService,
        { provide: OrderRepository, useValue: { create: jest.fn() } },
      ],
    }).compile();

    service = module.get<CreateOrderService>(CreateOrderService);
    orderRepository = module.get<{ create: jest.Mock }>(OrderRepository);
  });

  describe("execute", () => {
    it("calcula el total y delega la creación al repositorio", async () => {
      const items: OrderItems[] = [
        { productId: "p1", quantity: 2, unitPrice: 1500 },
        { productId: "p2", quantity: 1, unitPrice: 1000 },
      ];
      const created = { id: "order-1", totalAmount: 4000, items };
      orderRepository.create.mockResolvedValue(created);

      const result = await service.execute(items);

      expect(result).toEqual(created);
      expect(orderRepository.create).toHaveBeenCalledWith(4000, items);
      expect(orderRepository.create).toHaveBeenCalledTimes(1);
    });

    it("usa total 0 cuando la lista de items está vacía", async () => {
      orderRepository.create.mockResolvedValue(undefined);

      await service.execute([]);

      expect(orderRepository.create).toHaveBeenCalledWith(0, []);
    });

    it("propaga el error cuando el repositorio falla", async () => {
      const error = new Error("db down");
      orderRepository.create.mockRejectedValue(error);

      await expect(service.execute([])).rejects.toThrow(error);
    });
  });
});
