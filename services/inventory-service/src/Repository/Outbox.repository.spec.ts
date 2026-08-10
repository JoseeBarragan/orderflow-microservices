import { Test, TestingModule } from "@nestjs/testing";
import { InternalServerErrorException, Logger } from "@nestjs/common";
import { OutboxRepository } from "./Outbox.repository";
import { PrismaService } from "../prisma.service";
import {
  OutboxPayload,
  OutboxEventType,
  StockRejectedPayload,
  StockReservedPayload,
} from "../types/Inventory.types";

describe("OutboxRepository", () => {
  let repository: OutboxRepository;
  let outbox_events: {
    create: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    outbox_events = {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxRepository,
        { provide: PrismaService, useValue: { outbox_events } },
      ],
    }).compile();

    repository = module.get<OutboxRepository>(OutboxRepository);
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("save", () => {
    it("persiste el evento con el payload serializable a JSON y el eventType indicado", async () => {
      const payload: StockReservedPayload = {
        orderId: "o1",
        items: [{ productId: "p1", quantity: 2, unitPrice: 1500 }],
        totalAmount: 3000,
      };

      const expectedPayload = JSON.parse(
        JSON.stringify(payload),
      ) as StockReservedPayload;

      await repository.save("stock.reserve", payload);

      expect(outbox_events.create).toHaveBeenCalledTimes(1);
      expect(outbox_events.create).toHaveBeenCalledWith({
        data: {
          payload: expectedPayload,
          event_type: "stock.reserve",
        },
      });
    });

    it("serializa el payload rechazado sin perder campos", async () => {
      const payload: StockRejectedPayload = {
        orderId: "o1",
        reason: "PRODUCT_NOT_FOUND",
      };

      await repository.save("stock.reject", payload);

      expect(outbox_events.create).toHaveBeenCalledWith({
        data: {
          payload: { orderId: "o1", reason: "PRODUCT_NOT_FOUND" },
          event_type: "stock.reject",
        },
      });
    });

    it("lanza InternalServerErrorException cuando prisma falla y loguea el error", async () => {
      outbox_events.create.mockRejectedValue(new Error("db down"));

      await expect(
        repository.save("stock.reserve", {
          orderId: "o1",
          items: [],
          totalAmount: 0,
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it("acepta ambos eventType definidos por el tipo OutboxEventType", async () => {
      const events: OutboxEventType[] = ["stock.reserve", "stock.reject"];

      for (const eventType of events) {
        outbox_events.create.mockClear();
        const payload: OutboxPayload = {
          orderId: "o1",
          items: [],
          totalAmount: 0,
        };
        const expectedPayload = JSON.parse(
          JSON.stringify(payload),
        ) as OutboxPayload;

        await repository.save(eventType, payload);

        expect(outbox_events.create).toHaveBeenCalledWith({
          data: { payload: expectedPayload, event_type: eventType },
        });
      }
    });
  });

  describe("getPendingMessage", () => {
    it("busca mensajes con published=false, ordenados por created_at asc y take 20", async () => {
      const messages = [
        {
          id: "m1",
          event_type: "stock.reserve",
          payload: {},
          published: false,
          created_at: new Date(),
        },
      ];
      outbox_events.findMany.mockResolvedValue(messages);

      const result = await repository.getPendingMessage();

      expect(result).toEqual(messages);
      expect(outbox_events.findMany).toHaveBeenCalledWith({
        where: { published: false },
        orderBy: { created_at: "asc" },
        take: 20,
      });
    });

    it("lanza InternalServerErrorException cuando prisma falla", async () => {
      outbox_events.findMany.mockRejectedValue(new Error("db down"));

      await expect(repository.getPendingMessage()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe("updateMessagePublish", () => {
    it("marca el mensaje como publicado y registra published_at", async () => {
      const updated = { id: "m1", published: true, published_at: new Date() };
      outbox_events.update.mockResolvedValue(updated);

      const before = new Date();

      const result = await repository.updateMessagePublish("m1", true);

      expect(result).toEqual(updated);
      expect(outbox_events.update).toHaveBeenCalledTimes(1);
      const [{ where: whereArg, data: dataArg }] = outbox_events.update.mock
        .calls[0] as unknown as [
        {
          where: { id: string };
          data: { published: boolean; published_at: Date };
        },
      ];
      expect(whereArg).toEqual({ id: "m1" });
      expect(dataArg.published).toBe(true);
      expect(dataArg.published_at instanceof Date).toBe(true);
      expect(dataArg.published_at.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
    });

    it("lanza InternalServerErrorException cuando prisma falla", async () => {
      outbox_events.update.mockRejectedValue(new Error("db down"));

      await expect(repository.updateMessagePublish("m1", true)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
