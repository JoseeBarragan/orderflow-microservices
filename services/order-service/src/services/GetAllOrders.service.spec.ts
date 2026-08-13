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
        {
          provide: OrderRepository,
          useValue: {
            getAll: jest.fn(),
            create: jest.fn(),
            getPendingMessage: jest.fn(),
            updateMessagePublish: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GetAllOrdersService>(GetAllOrdersService);
    orderRepository = module.get<{ getAll: jest.Mock }>(OrderRepository);
  });

  describe("execute", () => {
    it("delega al repositorio y devuelve las órdenes almacenadas", async () => {
      const orders = [
        { id: "order-1", totalAmount: 3000 },
        { id: "order-2", totalAmount: 1000 },
      ];
      orderRepository.getAll.mockResolvedValue(orders);

      const result = await service.execute();

      expect(result).toEqual(orders);
      expect(orderRepository.getAll).toHaveBeenCalledTimes(1);
    });

    it("devuelve un arreglo vacío cuando no hay órdenes", async () => {
      orderRepository.getAll.mockResolvedValue([]);

      const result = await service.execute();

      expect(result).toEqual([]);
    });

    it("propaga el error cuando el repositorio falla", async () => {
      const error = new Error("db down");
      orderRepository.getAll.mockRejectedValue(error);

      await expect(service.execute()).rejects.toThrow(error);
    });
  });
});
