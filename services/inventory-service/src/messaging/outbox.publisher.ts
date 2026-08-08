import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { InventoryRepository } from "src/Inventory.repository";

const ROUTING_KEYS: Record<string, string> = {
  "stock.reserve": "stock.reserve",
};

@Injectable()
export class OutboxPublisher implements OnModuleInit {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    @Inject("RMQ_CLIENT") private readonly client: ClientProxy,
  ) {}

  onModuleInit() {
    setInterval(() => {
      void this.publishPending();
    }, 1000);
  }

  private async publishPending(): Promise<void> {
    const messages = await this.inventoryRepository.getPendingMessage();

    if (messages.length === 0) return;

    for (const msg of messages) {
      const routingKey = ROUTING_KEYS[msg.event_type];
      if (!routingKey) continue;

      try {
        this.client.emit(routingKey, msg.payload);
        await this.inventoryRepository.updateMessagePublish(msg.id, true);
      } catch (err) {
        console.error(`Error publicando mensaje ${msg.id}: ${err}`);
      }
    }
  }
}
