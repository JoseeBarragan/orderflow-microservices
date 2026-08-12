import { Controller } from "@nestjs/common";
import { EventPattern, GrpcMethod, Payload } from "@nestjs/microservices";
import { ConfirmPaymentService } from "./services/ConfirmPayment.service";
import type { StockReservedPayload } from "./types/payment.types";
import { CreatePaymentService } from "./services/CreatePayment.service";

@Controller()
export class PaymentController {
  constructor(
    private readonly confirmPaymentService: ConfirmPaymentService,
    private readonly createPaymentService: CreatePaymentService,
  ) {}

  @GrpcMethod("PaymentService")
  async confirmPayment(data: { orderId: string }) {
    console.log(data);
    return await this.confirmPaymentService.execute(data.orderId);
  }

  @EventPattern("stock.reserve")
  async createPayment(@Payload() payload: StockReservedPayload) {
    return await this.createPaymentService.execute(
      payload.orderId,
      payload.totalAmount,
    );
  }
}
