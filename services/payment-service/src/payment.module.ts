import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { PaymentRepository } from "./Repository/payment.repository";
import { ConfirmPaymentService } from "./services/ConfirmPayment.service";
import { ConfigModule } from "@nestjs/config";
import { CreatePaymentService } from "./services/CreatePayment.service";
import { PaymentGrpcController } from "./payment.grpc.controller";
import { PaymentEventController } from "./payment.rmq.controller";
import { GrpcExceptionFilter } from "./services/rpc-exception.filter";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [PaymentGrpcController, PaymentEventController],
  providers: [
    PrismaService,
    PaymentRepository,
    ConfirmPaymentService,
    GrpcExceptionFilter,
    CreatePaymentService,
  ],
})
export class PaymentModule {}
