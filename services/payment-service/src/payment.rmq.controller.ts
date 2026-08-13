import { Controller, Logger, UseFilters } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import type { StockReservedPayload } from "./types/payment.types";
import { CreatePaymentService } from "./services/CreatePayment.service";
import { RmqExceptionFilter } from "./services/rmq-exception.filter";

@UseFilters(new RmqExceptionFilter())
@Controller()
export class PaymentEventController {
  private logger = new Logger(PaymentEventController.name);
  constructor(private readonly createPaymentService: CreatePaymentService) {}

  @EventPattern("stock.reserve")
  async createPayment(@Payload() payload: StockReservedPayload) {
    try {
      return await this.createPaymentService.execute(
        payload.orderId,
        payload.totalAmount,
      );
    } catch (err) {
      this.logger.error(`${err}`);
      throw err;
    }
  }
}
