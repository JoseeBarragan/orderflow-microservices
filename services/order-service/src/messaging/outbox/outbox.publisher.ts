import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { OrderRepository } from "../../order.repository";
import { ClientProxy } from "@nestjs/microservices";

const ROUTING_KEYS: Record<string, string> = {
  OrderCreated: "order.created",
};

@Injectable()
export class OutboxPublisher implements OnModuleInit {
  constructor(
    private readonly orderRepository: OrderRepository,
    @Inject("RMQ_CLIENT") private readonly client: ClientProxy,
  ) {}

  onModuleInit() {
    setInterval(() => {
      void this.publishPending();
    }, 1000);
  }

  private async publishPending(): Promise<void> {
    const messages = await this.orderRepository.getPendingMessage();

    if (messages.length === 0) return;

    for (const msg of messages) {
      const routingKey = ROUTING_KEYS[msg.eventType];
      if (!routingKey) continue;

      try {
        this.client.emit(routingKey, msg.payload);
        await this.orderRepository.updateMessagePublish(msg.id, true);
      } catch (err) {
        console.error(`Error publicando mensaje ${msg.id}: ${err}`);
      }
    }
  }
}
