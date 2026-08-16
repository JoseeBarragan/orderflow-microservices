import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { OutboxRepository } from "../Repository/outbox.repository";
import { ClientProxy } from "@nestjs/microservices";

@Injectable()
export class OutboxPublisher implements OnModuleInit {
  constructor(
    private readonly outboxRepository: OutboxRepository,
    @Inject("RMQ_CLIENT") private readonly client: ClientProxy,
  ) {}

  onModuleInit() {
    setInterval(() => {
      void this.PublishPending();
    }, 1000);
  }

  async PublishPending() {
    const messages = await this.outboxRepository.getPendingMessages();

    if (messages.length === 0) return;

    for (const msg of messages) {
      if (!this.isOutboxEvent(msg.eventType)) {
        console.error(`Tipo de evento desconocido: ${msg.eventType}`);
        continue;
      }

      try {
        this.client.emit(msg.eventType, msg.payload);
        await this.outboxRepository.updateMessagePublish(msg.id, true);
      } catch (err) {
        console.error(`Error publicando mensaje ${msg.id}: ${err}`);
      }
    }
  }

  private isOutboxEvent(event: string) {
    return event === "payment.failed" || event === "payment.succed";
  }
}
