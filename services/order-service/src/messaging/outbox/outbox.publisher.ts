import { Injectable, OnModuleInit } from "@nestjs/common";
import { OrderRepository } from "../../order.repository";
import { RabbitMQConnection } from "../rabbitmq/rabbitmq.connection";

const ROUTING_KEYS: Record<string, string> = {
  OrderCreated: "order.created",
};

@Injectable()
export class OutboxPublisher implements OnModuleInit {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly rabbitMQ: RabbitMQConnection,
  ) {}

  onModuleInit() {
    setInterval(() => {
      void this.publishPending();
    }, 1000);
  }

  private async publishPending(): Promise<void> {
    const messages = await this.orderRepository.getPendingMessage();

    if (!messages) return;

    for (const msg of messages) {
      const routingKey = ROUTING_KEYS[msg.eventType];
      if (!routingKey) continue;

      try {
        this.rabbitMQ.publish(routingKey, msg.payload);
        await this.orderRepository.updateMessagePublish(msg.id, true);
      } catch (err) {
        console.error(`Error publicando mensaje ${msg.id}: ${err}`);
      }
    }
  }
}
