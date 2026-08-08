import { Test, TestingModule } from "@nestjs/testing";
import { OutboxPublisher } from "./outbox.publisher";
import { OrderRepository } from "../order.repository";

describe("OutboxPublisher", () => {
  let publisher: OutboxPublisher;
  let orderRepository: {
    getPendingMessage: jest.Mock;
    updateMessagePublish: jest.Mock;
  };
  let client: { emit: jest.Mock };

  beforeEach(async () => {
    jest.useFakeTimers();

    orderRepository = {
      getPendingMessage: jest.fn(),
      updateMessagePublish: jest.fn(),
    };

    client = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxPublisher,
        { provide: OrderRepository, useValue: orderRepository },
        { provide: "RMQ_CLIENT", useValue: client },
      ],
    }).compile();

    publisher = module.get<OutboxPublisher>(OutboxPublisher);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllTimers();
  });

  it("no emite nada cuando no hay mensajes pendientes", async () => {
    orderRepository.getPendingMessage.mockResolvedValue([]);
    publisher.onModuleInit();

    await jest.advanceTimersByTimeAsync(1000);

    expect(orderRepository.getPendingMessage).toHaveBeenCalled();
    expect(client.emit).not.toHaveBeenCalled();
    expect(orderRepository.updateMessagePublish).not.toHaveBeenCalled();
  });

  it("emite al exchange con la routing key 'order.created' para eventos OrderCreated", async () => {
    const payload = {
      orderId: "order-1",
      items: [{ productId: "p1", quantity: 2, unitPrice: 1500 }],
      totalAmount: 3000,
    };
    orderRepository.getPendingMessage.mockResolvedValue([
      { id: "ev-1", eventType: "OrderCreated", payload },
    ]);
    orderRepository.updateMessagePublish.mockResolvedValue(undefined);

    publisher.onModuleInit();

    await jest.advanceTimersByTimeAsync(1000);

    expect(client.emit).toHaveBeenCalledWith("order.created", payload);
    expect(orderRepository.updateMessagePublish).toHaveBeenCalledWith(
      "ev-1",
      true,
    );
  });

  it("ignora eventos con eventType desconocido (sin routing key)", async () => {
    orderRepository.getPendingMessage.mockResolvedValue([
      { id: "ev-x", eventType: "UnknownType", payload: {} },
    ]);

    publisher.onModuleInit();

    await jest.advanceTimersByTimeAsync(1000);

    expect(client.emit).not.toHaveBeenCalled();
    expect(orderRepository.updateMessagePublish).not.toHaveBeenCalled();
  });

  it("continúa procesando aunque un mensaje falle al publicar", async () => {
    const payloadOk = { orderId: "order-ok" };
    orderRepository.getPendingMessage.mockResolvedValue([
      {
        id: "ev-fail",
        eventType: "OrderCreated",
        payload: { orderId: "fail" },
      },
      { id: "ev-ok", eventType: "OrderCreated", payload: payloadOk },
    ]);
    orderRepository.updateMessagePublish
      .mockRejectedValueOnce(new Error("update failed"))
      .mockResolvedValueOnce(undefined);

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    publisher.onModuleInit();

    await jest.advanceTimersByTimeAsync(1000);

    expect(client.emit).toHaveBeenCalledTimes(2);
    expect(orderRepository.updateMessagePublish).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
