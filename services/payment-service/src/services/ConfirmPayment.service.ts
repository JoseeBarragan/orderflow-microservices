import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { PaymentRepository } from "../Repository/payment.repository";
import { status } from "@grpc/grpc-js";
import { PaymentNotFoundError } from "../types/Error.type";

@Injectable()
export class ConfirmPaymentService {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async execute(orderId: string) {
    try {
      return await this.paymentRepository.confirmPayment(orderId);
    } catch (err) {
      if (err instanceof PaymentNotFoundError) {
        throw new RpcException({
          code: status.NOT_FOUND,
          message: err.message,
        });
      }
      throw new RpcException({
        code: status.INTERNAL,
        message: "Error interno al confirmar el pago",
      });
    }
  }
}
