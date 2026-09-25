import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { OutboxRepository } from "../Repository/Outbox.repository";
import { OutboxEventType } from "../types/Inventory.types";
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
      void this.publishPending().catch((err) =>
        console.error(`Error consultando el outbox: ${err}`),
      );
    }, 1000);
  }

  onModuleDestroy() {
    clearInterval(this.timer);
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
        await firstValueFrom(this.client.emit(msg.event_type, msg.payload));
        await this.outboxRepository.updateMessagePublish(msg.id, true);
      } catch (err) {
        console.error(`Error publicando mensaje ${msg.id}: ${err}`);
      }
    }
  }

  private isOutboxEventType(value: string): value is OutboxEventType {
    return value === "stock.reserve" || value === "stock.reject";
  }
}
