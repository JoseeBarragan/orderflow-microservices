import { Test, TestingModule } from "@nestjs/testing";
import { OrderController } from "./order.controller";
import { CreateOrderService } from "./services/CreateOrder.service";
import { GetAllOrdersService } from "./services/GetAllOrders.service";
import { OrderItems } from "./types/order.entity";

describe("OrderController", () => {
  let controller: OrderController;
  let createOrderService: { execute: jest.Mock };
  let getAllOrdersService: { execute: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: CreateOrderService,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetAllOrdersService,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
    createOrderService = module.get<{ execute: jest.Mock }>(CreateOrderService);
    getAllOrdersService = module.get<{ execute: jest.Mock }>(
      GetAllOrdersService,
    );
  });

  describe("order.create", () => {
    it("delega la creación al CreateOrderService con los items recibidos", async () => {
      const items: OrderItems[] = [
        {
          productId: "3278373d-174f-467a-aaa5-82fc9957a6bf",
          quantity: 2,
          unitPrice: 1500,
        },
      ];
      const created = { id: "order-1", totalAmount: 3000, items };
      createOrderService.execute.mockResolvedValue(created);

      const result = await controller.createOrder({ items });

      expect(result).toEqual(created);
      expect(createOrderService.execute).toHaveBeenCalledWith(items);
      expect(createOrderService.execute).toHaveBeenCalledTimes(1);
    });

    it("propaga el error cuando el servicio falla", async () => {
      const items: OrderItems[] = [
        { productId: "p-1", quantity: 1, unitPrice: 100 },
      ];
      const error = new Error("falla de prisma");
      createOrderService.execute.mockRejectedValue(error);

      await expect(controller.createOrder({ items })).rejects.toThrow(error);
    });
  });

  describe("order.getAll", () => {
    it("delega al GetAllOrdersService y devuelve la lista de órdenes", async () => {
      const orders = [
        { id: "order-1", totalAmount: 3000 },
        { id: "order-2", totalAmount: 1000 },
      ];
      getAllOrdersService.execute.mockResolvedValue(orders);

      const result = await controller.getAllOrders();

      expect(result).toEqual(orders);
      expect(getAllOrdersService.execute).toHaveBeenCalledTimes(1);
    });

    it("propaga el error cuando el servicio falla", async () => {
      const error = new Error("db down");
      getAllOrdersService.execute.mockRejectedValue(error);

      await expect(controller.getAllOrders()).rejects.toThrow(error);
    });
  });
});
