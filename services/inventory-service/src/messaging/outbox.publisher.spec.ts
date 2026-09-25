import type { ClientProxy } from "@nestjs/microservices";
import { of, throwError } from "rxjs";
import { OutboxPublisher } from "./outbox.publisher";
import { OutboxRepository } from "../Repository/Outbox.repository";

type PublisherForTest = { publishPending: () => Promise<void> };

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe("OutboxPublisher", () => {
  let outboxRepository: {
    getPendingMessage: jest.Mock;
    updateMessagePublish: jest.Mock;
  };
  let client: { emit: jest.Mock };
  let instance: OutboxPublisher;
  let publisher: PublisherForTest;
  let errorSpy: jest.SpyInstance;
  let intervalCallback!: () => void;

  beforeEach(() => {
    outboxRepository = {
      getPendingMessage: jest.fn(),
      updateMessagePublish: jest.fn().mockResolvedValue(undefined),
    };
    client = { emit: jest.fn() };
    instance = new OutboxPublisher(
      outboxRepository as unknown as OutboxRepository,
      client as unknown as ClientProxy,
    );
    publisher = instance as unknown as PublisherForTest;
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("publishPending", () => {
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
  });

  describe("ciclo de vida", () => {
    it("registra un intervalo que dispara publishPending cada segundo", async () => {
      const setIntervalSpy = jest
        .spyOn(global, "setInterval")
        .mockImplementation(((cb: () => void) => {
          intervalCallback = cb;
          return 0;
        }) as never);
      outboxRepository.getPendingMessage.mockResolvedValue([]);

      instance.onModuleInit();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
      expect(outboxRepository.getPendingMessage).not.toHaveBeenCalled();

      intervalCallback();
      await flush();

      expect(outboxRepository.getPendingMessage).toHaveBeenCalledTimes(1);

      setIntervalSpy.mockRestore();
    });

    it("limpia el intervalo en onModuleDestroy", () => {
      const clearIntervalSpy = jest
        .spyOn(global, "clearInterval")
        .mockImplementation(() => undefined);
      jest
        .spyOn(global, "setInterval")
        .mockImplementation((() => 12345) as never);

      instance.onModuleInit();
      instance.onModuleDestroy();

      expect(clearIntervalSpy).toHaveBeenCalledWith(12345);

      jest.restoreAllMocks();
    });

    it("no deja la promesa sin manejar cuando la consulta al outbox falla", async () => {
      jest.spyOn(global, "setInterval").mockImplementation(((
        cb: () => void,
      ) => {
        intervalCallback = cb;
        return 0;
      }) as never);
      outboxRepository.getPendingMessage.mockRejectedValue(
        new Error("db down"),
      );

      instance.onModuleInit();

      expect(() => intervalCallback()).not.toThrow();
      await flush();

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("db down"));
      expect(client.emit).not.toHaveBeenCalled();
    });
  });
});
