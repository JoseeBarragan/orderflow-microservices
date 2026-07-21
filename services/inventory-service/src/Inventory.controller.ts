import { Controller } from "@nestjs/common";
import { MessagePattern } from "@nestjs/microservices";
import { InventoryService } from "./Inventory.service";
import type { ListProductsQuery } from "./Inventory.types";

@Controller()
export class InventoryController {
  constructor(private readonly appService: InventoryService) {}

  @MessagePattern("inventory.get")
  getProducts(payload: ListProductsQuery) {
    return this.appService.getProducts(payload?.limit, payload?.offset);
  }
}
