import { Inject, Injectable } from "@nestjs/common";
import { InventoryRepository } from "../Inventory.repository";
import { NewOrder } from "../Inventory.types";
import { ClientProxy } from "@nestjs/microservices";

@Injectable()
export class ReserveStockService {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    @Inject("RMQ_CLIENT") private readonly rabbitmq: ClientProxy,
  ) {}

  async execute(payload: NewOrder) {
    const ids = payload.items.map((i) => i.productId);
    const products = await this.inventoryRepository.findByIds(ids);

    if (products.length !== ids.length) {
      this.rabbitmq.emit("stock.rejected", "Invalid product on the order");
      return;
    }
    await this.inventoryRepository.reserveStock(payload);
    return;
  }
}
