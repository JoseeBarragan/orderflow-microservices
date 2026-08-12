import { Module } from "@nestjs/common";
import { PaymentController } from "./payment.controller";
import { PrismaService } from "./prisma.service";
import { PaymentRepository } from "./Repository/payment.repository";
import { ConfirmPaymentService } from "./services/ConfirmPayment.service";
import { ConfigModule } from "@nestjs/config";
import { CreatePaymentService } from "./services/CreatePayment.service";
import { ExceptionFilter } from "./services/rpc-exception.filter";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [PaymentController],
  providers: [
    PrismaService,
    PaymentRepository,
    ConfirmPaymentService,
    ExceptionFilter,
    CreatePaymentService,
  ],
})
export class PaymentModule {}
