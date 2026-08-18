import { Injectable } from "@nestjs/common";
import { InventoryRepository } from "src/Repository/Inventory.repository";

@Injectable()
export class ReleaseStockService {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async execute(orderId: string) {
    return await this.inventoryRepository.releaseStock(orderId);
  }
}
