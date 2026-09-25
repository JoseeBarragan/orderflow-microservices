import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import {
  PaymentAlreadySettledError,
  PaymentNotFoundError,
} from "../types/Error.type.js";

@Injectable()
export class PaymentRepository {
  private readonly logger = new Logger(PaymentRepository.name);
  constructor(private readonly prisma: PrismaService) {}

  async confirmPayment(
    orderId: string,
    status: "APPROVED" | "FAILED",
    eventType: string,
    payload: Record<string, string>,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const { count } = await tx.payment.updateMany({
          where: { orderId: orderId, status: "PENDING" },
          data: { status: status },
        });

        if (count === 0) {
          const existing = await tx.payment.findUnique({
            where: { orderId: orderId },
          });

          if (!existing) throw new PaymentNotFoundError(orderId);
          throw new PaymentAlreadySettledError(orderId, existing.status);
        }

        await tx.outboxEvent.create({
          data: {
            eventType: eventType,
            payload: payload,
          },
        });

        return payload;
      });
    } catch (err) {
      if (
        err instanceof PaymentNotFoundError ||
        err instanceof PaymentAlreadySettledError
      ) {
        throw err;
      }
      this.logger.error(`Error confirmando pago: ${err}`);
      throw err;
    }
  }

  async createPayment(orderId: string, totalAmount: number) {
    try {
      return await this.prisma.payment.create({
        data: {
          orderId: orderId,
          totalAmount: totalAmount,
        },
      });
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        this.logger.warn(
          `El pago de la orden ${orderId} ya existe, se ignora la entrega duplicada de stock.reserve`,
        );
        return await this.prisma.payment.findUnique({
          where: { orderId: orderId },
        });
      }
      this.logger.error(`Error creando el pago: ${err}`);
      throw err;
    }
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    );
  }
}
