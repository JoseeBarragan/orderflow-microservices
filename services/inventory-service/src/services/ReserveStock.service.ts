import { Injectable } from "@nestjs/common";
import { InventoryRepository } from "src/Inventory.repository";
import { NewOrder } from "src/Inventory.types";

@Injectable()
export class ReserveStockService {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async execute(payload: NewOrder) {}
}
