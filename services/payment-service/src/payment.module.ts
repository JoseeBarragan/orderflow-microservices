import { Module } from "@nestjs/common";
import { PaymentController } from "./payment.controller";
import { PrismaService } from "./prisma.service";
import { PaymentRepository } from "./Repository/payment.repository";
import { ConfirmPaymentService } from "./services/ConfirmPayment.service";
import { ConfigModule } from "@nestjs/config";
import { CreatePaymentService } from "./services/CreatePayment.service";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [PaymentController],
  providers: [
    PrismaService,
    PaymentRepository,
    ConfirmPaymentService,
    CreatePaymentService,
  ],
})
export class PaymentModule {}
