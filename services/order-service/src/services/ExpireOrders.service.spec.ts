import { Logger } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ExpireOrdersService } from "./ExpireOrders.service";
import { OrderRepository } from "src/Repository/order.repository";

describe("ExpireOrdersService", () => {
  let service: ExpireOrdersService;
  let orderRepository: {
    findStalePending: jest.Mock;
    cancelIfPendingAndEmit: jest.Mock;
  };
  let errorSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.useFakeTimers();
    errorSpy = jest.spyOn(Logger.prototype, "error").mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpireOrdersService,
        {
          provide: OrderRepository,
          useValue: {
            findStalePending: jest.fn(),
            cancelIfPendingAndEmit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ExpireOrdersService>(ExpireOrdersService);
    orderRepository = module.get(OrderRepository);
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("sweep", () => {
    it("busca ordenes PENDING con 15 minutos de antiguedad", async () => {
      orderRepository.findStalePending.mockResolvedValue([]);

      await service.sweep();

      const [olderThan] = orderRepository.findStalePending.mock.calls[0] as [
        Date,
      ];
      const expected = new Date(Date.now() - 15 * 60 * 1000);
      expect(Math.abs(olderThan.getTime() - expected.getTime())).toBeLessThan(
        1000,
      );
    });

    it("cancela cada orden vencida", async () => {
      orderRepository.findStalePending.mockResolvedValue([
        { orderId: "o1" },
        { orderId: "o2" },
      ]);
      orderRepository.cancelIfPendingAndEmit.mockResolvedValue(true);

      await service.sweep();

      expect(orderRepository.cancelIfPendingAndEmit).toHaveBeenCalledTimes(2);
      expect(orderRepository.cancelIfPendingAndEmit).toHaveBeenNthCalledWith(
        1,
        "o1",
      );
      expect(orderRepository.cancelIfPendingAndEmit).toHaveBeenNthCalledWith(
        2,
        "o2",
      );
    });

    it("no se equivoca cuando la orden ya no estaba PENDING", async () => {
      orderRepository.findStalePending.mockResolvedValue([{ orderId: "o1" }]);
      orderRepository.cancelIfPendingAndEmit.mockResolvedValue(false);

      await expect(service.sweep()).resolves.toBeUndefined();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("sigue con las demas ordenes si una falla", async () => {
      orderRepository.findStalePending.mockResolvedValue([
        { orderId: "o1" },
        { orderId: "o2" },
      ]);
      orderRepository.cancelIfPendingAndEmit
        .mockRejectedValueOnce(new Error("db down"))
        .mockResolvedValueOnce(true);

      await service.sweep();

      expect(orderRepository.cancelIfPendingAndEmit).toHaveBeenCalledTimes(2);
      expect(errorSpy).toHaveBeenCalled();
    });

    it("no hace nada cuando no hay ordenes vencidas", async () => {
      orderRepository.findStalePending.mockResolvedValue([]);

      await service.sweep();

      expect(orderRepository.cancelIfPendingAndEmit).not.toHaveBeenCalled();
    });
  });

  describe("timer", () => {
    it("barre cada 60 segundos una vez inicializado", async () => {
      orderRepository.findStalePending.mockResolvedValue([]);

      service.onModuleInit();
      await jest.advanceTimersByTimeAsync(60 * 1000);

      expect(orderRepository.findStalePending).toHaveBeenCalledTimes(1);
    });

    it("deja de barrer cuando se destruye el modulo", async () => {
      orderRepository.findStalePending.mockResolvedValue([]);

      service.onModuleInit();
      service.onModuleDestroy();
      await jest.advanceTimersByTimeAsync(120 * 1000);

      expect(orderRepository.findStalePending).not.toHaveBeenCalled();
    });
  });
});
