import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";

@Controller()
export class PaymentController {
  constructor() {}

  @GrpcMethod("PaymentService")
  confirmPayment() {
    return { status: "Hello" };
  }
}
