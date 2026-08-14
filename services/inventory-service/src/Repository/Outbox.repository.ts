import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { OutboxEventType, OutboxPayload } from "../types/Inventory.types";
import { InputJsonValue } from "@prisma/client/runtime/client";

@Injectable()
export class OutboxRepository {
  private readonly logger = new Logger(OutboxRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // JSON.parse(JSON.stringify()) guarantees a JSON-serializable object, but:
  // - undefined fields are silently dropped (use explicit null if that distinction matters)
  // - Date instances become plain strings, not Date objects, once read back
  // - NaN/Infinity/-Infinity are silently converted to null
  // - BigInt throws instead of serializing
  // None of these apply to the current payload (strings/numbers/arrays),
  // but keep it in mind if a more complex field gets added later.

  async save(eventType: OutboxEventType, payload: OutboxPayload) {
    try {
      await this.prisma.outbox_events.create({
        data: {
          payload: JSON.parse(JSON.stringify(payload)) as InputJsonValue,
          event_type: eventType,
        },
      });
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }

  async getPendingMessage() {
    try {
      return await this.prisma.outbox_events.findMany({
        where: { published: false },
        orderBy: { created_at: "asc" },
        take: 20,
      });
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }

  async updateMessagePublish(id: string, published: boolean) {
    try {
      return await this.prisma.outbox_events.update({
        where: { id: id },
        data: { published: published, published_at: new Date() },
      });
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }
}
