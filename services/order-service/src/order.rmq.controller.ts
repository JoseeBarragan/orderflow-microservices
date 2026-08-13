import { Controller, UseFilters } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import type { NewOrder } from "./types/order.entity";
import { CancelOrderService } from "./services/CancelOrder.service";
import { RmqExceptionFilter } from "./services/error/rmq-exception.filter";

@UseFilters(new RmqExceptionFilter())
@Controller("order")
export class OrderEventController {
  constructor(private readonly cancelOrderService: CancelOrderService) {}

  // TODO: this shouldnt be here, must be deleted, but its going to be used as a way to track the hole flow
  @EventPattern("stock.reserve")
  async handleStockReserved(@Payload() payload: NewOrder) {
    console.log("Stock reservado para orden", payload.orderId);
    return await Promise.resolve();
  }

  @EventPattern("stock.reject")
  async handleStockRejected(
    @Payload() payload: { orderId: string; reason: string },
  ) {
    await this.cancelOrderService.execute(payload.orderId);
  }
}
