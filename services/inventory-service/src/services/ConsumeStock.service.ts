import { Injectable } from "@nestjs/common";
import { InventoryRepository } from "src/Repository/Inventory.repository";

@Injectable()
export class ConsumeStockService {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async execute(orderId: string) {
    return await this.inventoryRepository.consumeStock(orderId);
  }
}
