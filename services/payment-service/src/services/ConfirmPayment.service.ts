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
      const isPaymentSuccessful = Math.random() < 0.8;

      if (isPaymentSuccessful) {
        throw new Error("SIMULATED_PAYMENT_ERROR");
      }

      return await this.paymentRepository.confirmPayment(orderId);
    } catch (err) {
      if (err instanceof PaymentNotFoundError) {
        throw new RpcException({
          code: status.NOT_FOUND,
          message: err.message,
        });
      } else if (
        err instanceof Error &&
        err.message === "SIMULATED_PAYMENT_ERROR"
      ) {
        throw new RpcException({
          code: status.ABORTED,
          message: "El pago fue rechazado por la pasarela",
        });
      }
      throw new RpcException({
        code: status.INTERNAL,
        message: "Error interno al confirmar el pago",
      });
    }
  }
}
