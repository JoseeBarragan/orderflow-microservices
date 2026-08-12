import { Injectable } from "@nestjs/common";
import { PaymentRepository } from "src/Repository/payment.repository";

@Injectable()
export class ConfirmPaymentService {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async execute(orderId: string) {
    return await this.paymentRepository.confirmPayment(orderId);
  }
}
