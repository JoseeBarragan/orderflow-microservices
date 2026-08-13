import { Test, TestingModule } from "@nestjs/testing";
import { CreateOrderService } from "./CreateOrder.service";
import { OrderRepository } from "../Repository/order.repository";

describe("CreateOrderService", () => {
  let service: CreateOrderService;
  let orderRepository: { create: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOrderService,
        {
          provide: OrderRepository,
          useValue: {
            create: jest.fn(),
            getAll: jest.fn(),
            getPendingMessage: jest.fn(),
            updateMessagePublish: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CreateOrderService>(CreateOrderService);
    orderRepository = module.get<{ create: jest.Mock }>(OrderRepository);
  });

  describe("execute", () => {
    it("calcula el total (unitPrice * quantity) y delega al repositorio", async () => {
      const items = [
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

    it("devuelve total 0 cuando los items no suman importe", async () => {
      const items = [
        { productId: "p1", quantity: 0, unitPrice: 1500 },
        { productId: "p2", quantity: 2, unitPrice: 0 },
      ];
      orderRepository.create.mockResolvedValue({ id: "order-0" });

      await service.execute(items);

      expect(orderRepository.create).toHaveBeenCalledWith(0, items);
    });

    it("propaga el error del repositorio", async () => {
      const items = [{ productId: "p1", quantity: 1, unitPrice: 100 }];
      const error = new Error("falla de prisma");
      orderRepository.create.mockRejectedValue(error);

      await expect(service.execute(items)).rejects.toThrow(error);
    });
  });
});
