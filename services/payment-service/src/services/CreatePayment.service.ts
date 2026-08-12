import { Injectable } from "@nestjs/common";
import { PaymentRepository } from "src/Repository/payment.repository";

@Injectable()
export class CreatePaymentService {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async execute(orderId: string, totalAmount: number) {
    return await this.paymentRepository.createPayment(orderId, totalAmount);
  }
}
