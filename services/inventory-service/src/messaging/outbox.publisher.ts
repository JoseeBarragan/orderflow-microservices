import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { OutboxRepository } from "src/Repository/Outbox.repository";
import { OutboxEventType } from "src/types/Inventory.types";

@Injectable()
export class OutboxPublisher implements OnModuleInit {
  constructor(
    private readonly outboxRepository: OutboxRepository,
    @Inject("RMQ_CLIENT") private readonly client: ClientProxy,
  ) {}

  onModuleInit() {
    setInterval(() => {
      void this.publishPending();
    }, 1000);
  }

  private async publishPending(): Promise<void> {
    const messages = await this.outboxRepository.getPendingMessage();

    if (messages.length === 0) return;

    for (const msg of messages) {
      if (!this.isOutboxEventType(msg.event_type)) {
        console.error(`Tipo de evento desconocido: ${msg.event_type}`);
        continue;
      }
      try {
        this.client.emit(msg.event_type, msg.payload);
        await this.outboxRepository.updateMessagePublish(msg.id, true);
      } catch (err) {
        console.error(`Error publicando mensaje ${msg.id}: ${err}`);
      }
    }
  }

  private isOutboxEventType(value: string): value is OutboxEventType {
    return value === "StockReserved" || value === "StockRejected";
  }
}
