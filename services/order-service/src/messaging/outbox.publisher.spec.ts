import { Test, TestingModule } from "@nestjs/testing";
import { of } from "rxjs";
import { OutboxPublisher } from "./outbox.publisher";
import { OutboxRepository } from "../Repository/outbox.repository";

describe("OutboxPublisher", () => {
  let publisher: OutboxPublisher;
  let outboxRepository: {
    getPendingMessage: jest.Mock;
    updateMessagePublish: jest.Mock;
  };
  let client: { emit: jest.Mock };
  let errorSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.useFakeTimers();

    outboxRepository = {
      getPendingMessage: jest.fn(),
      updateMessagePublish: jest.fn(),
    };

    client = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxPublisher,
        { provide: OutboxRepository, useValue: outboxRepository },
        { provide: "RMQ_CLIENT", useValue: client },
      ],
    }).compile();

    publisher = module.get<OutboxPublisher>(OutboxPublisher);
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    jest.useRealTimers();
    jest.clearAllTimers();
  });

  it("no emite nada cuando no hay mensajes pendientes", async () => {
    outboxRepository.getPendingMessage.mockResolvedValue([]);

    publisher.onModuleInit();

    await jest.advanceTimersByTimeAsync(1000);

    expect(outboxRepository.getPendingMessage).toHaveBeenCalled();
    expect(client.emit).not.toHaveBeenCalled();
    expect(outboxRepository.updateMessagePublish).not.toHaveBeenCalled();
  });

  it("emite con la routing key 'order.created' y marca el mensaje como publicado", async () => {
    const payload = {
      orderId: "order-1",
      items: [{ productId: "p1", quantity: 2, unitPrice: 1500 }],
      totalAmount: 3000,
    };
    outboxRepository.getPendingMessage.mockResolvedValue([
      { id: "ev-1", eventType: "order.created", payload },
    ]);
    outboxRepository.updateMessagePublish.mockResolvedValue(undefined);
    client.emit.mockReturnValue(of(payload));

    publisher.onModuleInit();

    await jest.advanceTimersByTimeAsync(1000);

    expect(client.emit).toHaveBeenCalledWith("order.created", payload);
    expect(outboxRepository.updateMessagePublish).toHaveBeenCalledWith(
      "ev-1",
      true,
    );
  });

  it("ignora y loguea los eventos con eventType desconocido", async () => {
    outboxRepository.getPendingMessage.mockResolvedValue([
      { id: "ev-x", eventType: "UnknownType", payload: {} },
    ]);

    publisher.onModuleInit();

    await jest.advanceTimersByTimeAsync(1000);

    expect(errorSpy).toHaveBeenCalled();
    expect(client.emit).not.toHaveBeenCalled();
    expect(outboxRepository.updateMessagePublish).not.toHaveBeenCalled();
  });

  it("continúa procesando aunque falle al publicar o marcar un mensaje", async () => {
    const payloadOk = { orderId: "order-ok" };
    outboxRepository.getPendingMessage.mockResolvedValue([
      {
        id: "ev-fail",
        eventType: "order.created",
        payload: { orderId: "fail" },
      },
      { id: "ev-ok", eventType: "order.created", payload: payloadOk },
    ]);
    outboxRepository.updateMessagePublish
      .mockRejectedValueOnce(new Error("update failed"))
      .mockResolvedValueOnce(undefined);
    client.emit.mockImplementation((_eventType: string, payload: unknown) =>
      of(payload),
    );

    publisher.onModuleInit();

    await jest.advanceTimersByTimeAsync(1000);

    expect(client.emit).toHaveBeenCalledTimes(2);
    expect(outboxRepository.updateMessagePublish).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalled();
  });
});
