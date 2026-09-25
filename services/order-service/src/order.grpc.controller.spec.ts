import { Test, TestingModule } from "@nestjs/testing";
import { OrderGrpcController } from "./order.grpc.controller";
import { CreateOrderService } from "./services/CreateOrder.service";
import { GetAllOrdersService } from "./services/GetAllOrders.service";
import { GetByIdService } from "./services/GetById.service";
import type { OrderItems } from "./types/order.entity";

describe("OrderGrpcController", () => {
  let controller: OrderGrpcController;
  let createOrderService: { execute: jest.Mock };
  let getAllOrdersService: { execute: jest.Mock };
  let getByIdService: { execute: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderGrpcController],
      providers: [
        { provide: CreateOrderService, useValue: { execute: jest.fn() } },
        { provide: GetAllOrdersService, useValue: { execute: jest.fn() } },
        { provide: GetByIdService, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    controller = module.get<OrderGrpcController>(OrderGrpcController);
    createOrderService = module.get<{ execute: jest.Mock }>(CreateOrderService);
    getAllOrdersService = module.get<{ execute: jest.Mock }>(
      GetAllOrdersService,
    );
    getByIdService = module.get<{ execute: jest.Mock }>(GetByIdService);
  });

  describe("getOrderById", () => {
    it("delega al GetByIdService con el orderId", async () => {
      const order = { id: "order-1", status: "PENDING" };
      getByIdService.execute.mockResolvedValue(order);

      const result = await controller.getOrderById({ orderId: "order-1" });

      expect(result).toEqual(order);
      expect(getByIdService.execute).toHaveBeenCalledWith("order-1");
      expect(getByIdService.execute).toHaveBeenCalledTimes(1);
    });

    it("propaga el error cuando el servicio falla", async () => {
      const error = new Error("not found");
      getByIdService.execute.mockRejectedValue(error);

      await expect(
        controller.getOrderById({ orderId: "nope" }),
      ).rejects.toThrow(error);
    });
  });

  describe("createOrder", () => {
    it("delega la creación al CreateOrderService con los items", async () => {
      const items: OrderItems[] = [
        { productId: "p1", quantity: 2, unitPrice: 1500 },
      ];
      const created = { id: "order-1", totalAmount: 3000, items };
      createOrderService.execute.mockResolvedValue(created);

      const result = await controller.createOrder({ items });

      expect(result).toEqual(created);
      expect(createOrderService.execute).toHaveBeenCalledWith(items);
      expect(createOrderService.execute).toHaveBeenCalledTimes(1);
    });

    it("propaga el error cuando el servicio falla", async () => {
      const error = new Error("db down");
      createOrderService.execute.mockRejectedValue(error);

      await expect(controller.createOrder({ items: [] })).rejects.toThrow(
        error,
      );
    });
  });

  describe("getAllOrders", () => {
    it("delega al GetAllOrdersService y devuelve la lista de órdenes", async () => {
      const orders = { orders: [{ orderId: "o1" }] };
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
