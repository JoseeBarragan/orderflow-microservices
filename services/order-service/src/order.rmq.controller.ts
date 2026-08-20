import { Controller, UseFilters } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import { CancelOrderService } from "./services/CancelOrder.service";
import { RmqExceptionFilter } from "./services/error/rmq-exception.filter";

@UseFilters(new RmqExceptionFilter())
@Controller("order")
export class OrderEventController {
  constructor(private readonly cancelOrderService: CancelOrderService) {}

  @EventPattern("stock.reject")
  async handleStockRejected(
    @Payload() payload: { orderId: string; reason: string },
  ) {
    await this.cancelOrderService.execute(payload.orderId);
  }

  @EventPattern("payment.failed")
  async handlePaymentFailed(@Payload() payload: { orderId: string }) {
    await this.cancelOrderService.execute(payload.orderId);
  }
}
