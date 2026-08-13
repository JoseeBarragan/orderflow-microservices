import { Controller, UseFilters } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { ConfirmPaymentService } from "./services/ConfirmPayment.service";
import { GrpcExceptionFilter } from "./services/rpc-exception.filter";

@UseFilters(new GrpcExceptionFilter())
@Controller()
export class PaymentGrpcController {
  constructor(private readonly confirmPaymentService: ConfirmPaymentService) {}

  @GrpcMethod("PaymentService")
  async confirmPayment(data: { orderId: string }) {
    return await this.confirmPaymentService.execute(data.orderId);
  }
}
