import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { PaymentRepository } from "../Repository/payment.repository";
import { status } from "@grpc/grpc-js";
import { PaymentNotFoundError } from "../types/Error.type";

@Injectable()
export class ConfirmPaymentService {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async execute(orderId: string) {
    const isPaymentSuccessful = Math.random() < 0.8;
    const newStatus = isPaymentSuccessful ? "APPROVED" : "FAILED";
    const eventType = isPaymentSuccessful
      ? "payment.approved"
      : "payment.failed";

    try {
      await this.paymentRepository.confirmPayment(
        orderId,
        newStatus,
        eventType,
        { orderId },
      );
      return { status: newStatus };
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
