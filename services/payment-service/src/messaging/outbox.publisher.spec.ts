import { Test, TestingModule } from "@nestjs/testing";
import { of, throwError } from "rxjs";
import { OutboxPublisher } from "./outbox.publisher";
import { OutboxRepository } from "../Repository/outbox.repository";

describe("OutboxPublisher", () => {
  let publisher: OutboxPublisher;
  let outboxRepository: {
    getPendingMessages: jest.Mock;
    updateMessagePublish: jest.Mock;
  };
  let client: { emit: jest.Mock };
  let errorSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.useFakeTimers();

    outboxRepository = {
      getPendingMessages: jest.fn(),
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
    jest.restoreAllMocks();
    jest.useRealTimers();
    jest.clearAllTimers();
  });

  it("no emite nada cuando no hay mensajes pendientes", async () => {
    outboxRepository.getPendingMessages.mockResolvedValue([]);

    publisher.onModuleInit();
    await jest.advanceTimersByTimeAsync(1000);

    expect(outboxRepository.getPendingMessages).toHaveBeenCalled();
    expect(client.emit).not.toHaveBeenCalled();
    expect(outboxRepository.updateMessagePublish).not.toHaveBeenCalled();
  });

  it("emite payment.approved y payment.failed y los marca como publicados", async () => {
    outboxRepository.getPendingMessages.mockResolvedValue([
      { id: "ev-1", eventType: "payment.approved", payload: { orderId: "o1" } },
      { id: "ev-2", eventType: "payment.failed", payload: { orderId: "o2" } },
    ]);
    outboxRepository.updateMessagePublish.mockResolvedValue(undefined);
    client.emit.mockReturnValue(of(1));

    publisher.onModuleInit();
    await jest.advanceTimersByTimeAsync(1000);

    expect(client.emit).toHaveBeenNthCalledWith(1, "payment.approved", {
      orderId: "o1",
    });
    expect(client.emit).toHaveBeenNthCalledWith(2, "payment.failed", {
      orderId: "o2",
    });
    expect(outboxRepository.updateMessagePublish).toHaveBeenCalledWith(
      "ev-1",
      true,
    );
    expect(outboxRepository.updateMessagePublish).toHaveBeenCalledWith(
      "ev-2",
      true,
    );
  });

  it("ignora y loguea los eventos con eventType desconocido", async () => {
    outboxRepository.getPendingMessages.mockResolvedValue([
      { id: "ev-x", eventType: "UnknownType", payload: {} },
    ]);

    publisher.onModuleInit();
    await jest.advanceTimersByTimeAsync(1000);

    expect(errorSpy).toHaveBeenCalled();
    expect(client.emit).not.toHaveBeenCalled();
    expect(outboxRepository.updateMessagePublish).not.toHaveBeenCalled();
  });

  it("no marca como publicado un mensaje cuya emisión falla y sigue con el siguiente", async () => {
    outboxRepository.getPendingMessages.mockResolvedValue([
      {
        id: "ev-fail",
        eventType: "payment.approved",
        payload: { orderId: "a" },
      },
      { id: "ev-ok", eventType: "payment.approved", payload: { orderId: "b" } },
    ]);
    outboxRepository.updateMessagePublish.mockResolvedValue(undefined);
    client.emit
      .mockReturnValueOnce(throwError(() => new Error("broker caido")))
      .mockReturnValueOnce(of(1));

    publisher.onModuleInit();
    await jest.advanceTimersByTimeAsync(1000);

    expect(client.emit).toHaveBeenCalledTimes(2);
    expect(outboxRepository.updateMessagePublish).toHaveBeenCalledTimes(1);
    expect(outboxRepository.updateMessagePublish).toHaveBeenCalledWith(
      "ev-ok",
      true,
    );
    expect(errorSpy).toHaveBeenCalled();
  });

  it("no deja la promesa sin manejar cuando la consulta al outbox falla", async () => {
    outboxRepository.getPendingMessages.mockRejectedValue(new Error("db down"));

    publisher.onModuleInit();
    await jest.advanceTimersByTimeAsync(1000);

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("db down"));
    expect(client.emit).not.toHaveBeenCalled();
  });

  it("deja de consultar al outbox después de onModuleDestroy", async () => {
    outboxRepository.getPendingMessages.mockResolvedValue([]);

    publisher.onModuleInit();
    await jest.advanceTimersByTimeAsync(1000);
    expect(outboxRepository.getPendingMessages).toHaveBeenCalledTimes(1);

    publisher.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(5000);

    expect(outboxRepository.getPendingMessages).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});
