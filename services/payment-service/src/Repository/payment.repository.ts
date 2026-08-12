import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../prisma.service";
import { PaymentNotFoundError } from "../types/Error.type.js";

@Injectable()
export class PaymentRepository {
  private readonly logger = new Logger(PaymentRepository.name);
  constructor(private readonly prisma: PrismaService) {}

  async confirmPayment(orderId: string) {
    try {
      return await this.prisma.payment.update({
        where: { orderId: orderId },
        data: { status: "PAID" },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err?.code === "P2025"
      ) {
        throw new PaymentNotFoundError(orderId);
      }
      this.logger.error(`Error confirmando pago: ${err}`);
      throw err;
    }
  }

  async createPayment(orderId: string, totalAmount: number) {
    return await this.prisma.payment.create({
      data: {
        orderId: orderId,
        totalAmount: totalAmount,
      },
    });
  }
}
