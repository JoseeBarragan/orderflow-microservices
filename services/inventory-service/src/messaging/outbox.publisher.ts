import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { OutboxRepository } from "../Repository/Outbox.repository";
import { OutboxEventType } from "../types/Inventory.types";
import { firstValueFrom } from "rxjs";

@Injectable()
export class OutboxPublisher implements OnModuleInit {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly outboxRepository: OutboxRepository,
    @Inject("RMQ_CLIENT") private readonly client: ClientProxy,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.publishPending();
    }, 1000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async publishPending(): Promise<void> {
    if (this.running) return;
    this.running = true;

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
      } finally {
        this.running = false;
      }
    }
  }

  private isOutboxEventType(value: string): value is OutboxEventType {
    return value === "stock.reserve" || value === "stock.reject";
  }
}
