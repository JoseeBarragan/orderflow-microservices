import { Injectable } from "@nestjs/common";
import { InventoryRepository } from "../Repository/Inventory.repository";
import { OutboxRepository } from "../Repository/Outbox.repository";
import { NewOrder } from "../types/Inventory.types";

@Injectable()
export class ReserveStockService {
  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly inventoryRepository: InventoryRepository,
  ) {}

  async execute(payload: NewOrder) {
    const ids = payload.items.map((i) => i.productId);
    const products = await this.inventoryRepository.findByIds(ids);

    if (products.length !== ids.length) {
      await this.outboxRepository.save("stock.reject", {
        orderId: payload.orderId,
        reason: "PRODUCT_NOT_FOUND",
      });
      return;
    }

    const result = await this.inventoryRepository.reserveStock(payload);

    if (!result.success) {
      await this.outboxRepository.save("stock.reject", {
        orderId: payload.orderId,
        reason: result?.reason,
      });
      return;
    }

    await this.outboxRepository.save("stock.reserve", {
      orderId: payload.orderId,
      items: payload.items,
      totalAmount: payload.totalAmount,
    });
    return;
  }
}
