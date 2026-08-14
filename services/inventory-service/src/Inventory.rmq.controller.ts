import { Controller, UseFilters } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import { ReserveStockService } from "./services/ReserveStock.service";
import type { NewOrder } from "./types/Inventory.types";
import { RmqExceptionFilter } from "./services/error/rmq-exception.filter";

@UseFilters(new RmqExceptionFilter())
@Controller()
export class InventoryRmqController {
  constructor(private readonly reserveStockService: ReserveStockService) {}

  @EventPattern("order.created")
  async reserveStock(@Payload() payload: NewOrder) {
    return await this.reserveStockService.execute(payload);
  }
}
