import { Controller } from "@nestjs/common";
import { EventPattern, MessagePattern, Payload } from "@nestjs/microservices";
import { GetAllProductsService } from "./services/GetAllProducts.service";
import { ReserveStockService } from "./services/ReserveStock.service";
import type {
  ListProductsQuery,
  NewOrder,
  Product,
} from "./types/Inventory.types";

@Controller()
export class InventoryController {
  constructor(
    private readonly getAllProductsService: GetAllProductsService,
    private readonly reserveStockService: ReserveStockService,
  ) {}

  @MessagePattern("inventory.get")
  async getProducts(payload: ListProductsQuery): Promise<Product[]> {
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
