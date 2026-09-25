import { Controller, UseFilters } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import { ReserveStockService } from "./services/ReserveStock.service";
import type { NewOrder } from "./types/Inventory.types";
import { RmqExceptionFilter } from "./services/error/rmq-exception.filter";
import { ReleaseStockService } from "./services/ReleaseStock.service";
import { ConsumeStockService } from "./services/ConsumeStock.service";

@UseFilters(new RmqExceptionFilter())
@Controller()
export class InventoryRmqController {
  constructor(
    private readonly reserveStockService: ReserveStockService,
    private readonly releaseStockService: ReleaseStockService,
    private readonly consumeStockService: ConsumeStockService,
  ) {}

  @EventPattern("order.created")
  async reserveStock(@Payload() payload: NewOrder) {
    return await this.reserveStockService.execute(payload);
  }

  @EventPattern("payment.failed")
  async releaseStock(@Payload() payload: { orderId: string }) {
    return await this.releaseStockService.execute(payload.orderId);
  }

  @EventPattern("order.cancelled")
  async releaseStockOnOrderCancelled(@Payload() payload: { orderId: string }) {
    return await this.releaseStockService.execute(payload.orderId);
  }

  @EventPattern("payment.approved")
  async consumeStock(@Payload() payload: { orderId: string }) {
    return await this.consumeStockService.execute(payload.orderId);
  }
}
