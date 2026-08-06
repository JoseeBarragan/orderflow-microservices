import { Controller } from "@nestjs/common";
import { EventPattern, MessagePattern, Payload } from "@nestjs/microservices";
import type { ListProductsQuery, NewOrder } from "./Inventory.types";
import { GetAllProductsService } from "./services/GetAllProducts.service";
import { ReserveStockService } from "./services/ReserveStock.service";

@Controller()
export class InventoryController {
  constructor(
    private readonly getAllProductsService: GetAllProductsService,
    private readonly reserveStockService: ReserveStockService,
  ) {}

  @MessagePattern("inventory.get")
  async getProducts(payload: ListProductsQuery) {
    return await this.getAllProductsService.getProducts(
      payload?.limit,
      payload?.offset,
    );
  }

  @EventPattern("order.created")
  async reserveStock(@Payload() payload: NewOrder) {
    return await this.reserveStockService.execute(payload);
  }
}
