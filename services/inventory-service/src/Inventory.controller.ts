import { Controller } from "@nestjs/common";
import { EventPattern, MessagePattern } from "@nestjs/microservices";
import type { ListProductsQuery } from "./Inventory.types";
import { InventoryService } from "./services/Inventory.service";

@Controller()
export class InventoryController {
  constructor(private readonly appService: InventoryService) {}

  @MessagePattern("inventory.get")
  async getProducts(payload: ListProductsQuery) {
    return await this.appService.getProducts(payload?.limit, payload?.offset);
  }

  @EventPattern("order.created")
  reserveStock(payload) {
    console.log("The event happen", payload);
    return;
  }
}
