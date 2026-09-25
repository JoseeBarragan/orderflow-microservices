import type { ClientProxy } from "@nestjs/microservices";
import { of, throwError } from "rxjs";
import { OutboxPublisher } from "./outbox.publisher";
import { OutboxRepository } from "../Repository/Outbox.repository";

type PublisherForTest = { publishPending: () => Promise<void> };

describe("OutboxPublisher", () => {
  let outboxRepository: {
    getPendingMessage: jest.Mock;
    updateMessagePublish: jest.Mock;
  };
  let client: { emit: jest.Mock };
  let publisher: PublisherForTest;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    outboxRepository = {
      getPendingMessage: jest.fn(),
      updateMessagePublish: jest.fn().mockResolvedValue(undefined),
    };
    client = { emit: jest.fn() };
    publisher = new OutboxPublisher(
      outboxRepository as unknown as OutboxRepository,
      client as unknown as ClientProxy,
    ) as unknown as PublisherForTest;
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("publica los mensajes conocidos y los marca como publicados", async () => {
    outboxRepository.getPendingMessage.mockResolvedValue([
      { id: "m1", event_type: "stock.reserve", payload: { orderId: "o1" } },
      { id: "m2", event_type: "stock.reject", payload: { orderId: "o2" } },
    ]);
    client.emit.mockReturnValue(of(1));

    await publisher.publishPending();

    expect(client.emit).toHaveBeenNthCalledWith(1, "stock.reserve", {
      orderId: "o1",
    });
    expect(client.emit).toHaveBeenNthCalledWith(2, "stock.reject", {
      orderId: "o2",
    });
    expect(outboxRepository.updateMessagePublish).toHaveBeenCalledWith(
      "m1",
      true,
    );
    expect(outboxRepository.updateMessagePublish).toHaveBeenCalledWith(
      "m2",
      true,
    );
  });

  it("no emite ni marca nada cuando no hay mensajes pendientes", async () => {
    outboxRepository.getPendingMessage.mockResolvedValue([]);

    await publisher.publishPending();

    expect(client.emit).not.toHaveBeenCalled();
    expect(outboxRepository.updateMessagePublish).not.toHaveBeenCalled();
  });

  it("salta los eventos de tipo desconocido sin publicarlos", async () => {
    outboxRepository.getPendingMessage.mockResolvedValue([
      { id: "m1", event_type: "unknown.event", payload: { orderId: "o1" } },
    ]);
    client.emit.mockReturnValue(of(1));

    await publisher.publishPending();

    expect(client.emit).not.toHaveBeenCalled();
    expect(outboxRepository.updateMessagePublish).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("no marca como publicado un mensaje cuya emisión falla", async () => {
    outboxRepository.getPendingMessage.mockResolvedValue([
      { id: "m1", event_type: "stock.reserve", payload: { orderId: "o1" } },
    ]);
    client.emit.mockReturnValue(
      throwError(() => new Error("broker no disponible")),
    );

    await publisher.publishPending();

    expect(client.emit).toHaveBeenCalledWith("stock.reserve", {
      orderId: "o1",
    });
    expect(outboxRepository.updateMessagePublish).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("no ejecuta una segunda pasada mientras la anterior sigue en curso", async () => {
    let resolveMessages!: (value: unknown[]) => void;
    const pending = new Promise<unknown[]>((resolve) => {
      resolveMessages = resolve;
    });
    outboxRepository.getPendingMessage.mockReturnValue(pending);

    const first = publisher.publishPending();
    const second = publisher.publishPending();

    resolveMessages([]);
    await Promise.all([first, second]);

    expect(outboxRepository.getPendingMessage).toHaveBeenCalledTimes(1);
    expect(client.emit).not.toHaveBeenCalled();
  });

  it("propaga el error de la consulta al outbox, ya que no está protegido", async () => {
    const error = new Error("db down");
    outboxRepository.getPendingMessage.mockRejectedValue(error);

    await expect(publisher.publishPending()).rejects.toThrow(error);
    expect(client.emit).not.toHaveBeenCalled();
  });
});
