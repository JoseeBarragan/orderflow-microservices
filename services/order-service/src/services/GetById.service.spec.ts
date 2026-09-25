import { RpcException } from "@nestjs/microservices";
import { status } from "@grpc/grpc-js";
import { Test, TestingModule } from "@nestjs/testing";
import { GetByIdService } from "./GetById.service";
import { OrderRepository } from "../Repository/order.repository";

describe("GetByIdService", () => {
  let service: GetByIdService;
  let orderRepository: { getById: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetByIdService,
        { provide: OrderRepository, useValue: { getById: jest.fn() } },
      ],
    }).compile();

    service = module.get<GetByIdService>(GetByIdService);
    orderRepository = module.get<{ getById: jest.Mock }>(OrderRepository);
  });

  describe("execute", () => {
    it("devuelve la orden cuando existe", async () => {
      const order = { orderId: "o1", status: "PENDING", items: [] };
      orderRepository.getById.mockResolvedValue(order);

      const result = await service.execute("o1");

      expect(result).toEqual(order);
      expect(orderRepository.getById).toHaveBeenCalledWith("o1");
      expect(orderRepository.getById).toHaveBeenCalledTimes(1);
    });

    it("lanza RpcException NOT_FOUND cuando la orden no existe", async () => {
      orderRepository.getById.mockResolvedValue(null);

      const promise = service.execute("missing");

      await expect(promise).rejects.toBeInstanceOf(RpcException);
      await expect(service.execute("missing")).rejects.toMatchObject({
        error: { code: status.NOT_FOUND, message: "Order Not Found" },
      });
    });

    it("propaga el error cuando el repositorio falla", async () => {
      const error = new Error("db down");
      orderRepository.getById.mockRejectedValue(error);

      await expect(service.execute("o1")).rejects.toThrow(error);
    });
  });
});
