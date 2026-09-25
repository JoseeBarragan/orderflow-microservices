import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { OutboxRepository } from "../Repository/outbox.repository";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";

@Injectable()
export class OutboxPublisher implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval>;

  constructor(
    private readonly outboxRepository: OutboxRepository,
    @Inject("RMQ_CLIENT") private readonly client: ClientProxy,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.PublishPending().catch((err) =>
        console.error(`Error consultando el outbox: ${err}`),
      );
    }, 1000);
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  async PublishPending(): Promise<void> {
    const messages = await this.outboxRepository.getPendingMessages();

    if (messages.length === 0) return;

    for (const msg of messages) {
      if (!this.isOutboxEvent(msg.eventType)) {
        console.error(`Tipo de evento desconocido: ${msg.eventType}`);
        continue;
      }

      try {
        await firstValueFrom(this.client.emit(msg.eventType, msg.payload));
        await this.outboxRepository.updateMessagePublish(msg.id, true);
      } catch (err) {
        console.error(`Error publicando mensaje ${msg.id}: ${err}`);
      }
    }
  }

  private isOutboxEvent(event: string) {
    return event === "payment.failed" || event === "payment.approved";
  }
}
