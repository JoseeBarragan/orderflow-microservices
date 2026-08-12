import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async confirmPayment(orderId: string) {
    return await this.prisma.payment.update({
      where: { orderId: orderId },
      data: { status: "PAID" },
    });
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
