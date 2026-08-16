import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { PaymentRepository } from "./Repository/payment.repository";
import { ConfirmPaymentService } from "./services/ConfirmPayment.service";
import { ConfigModule } from "@nestjs/config";
import { CreatePaymentService } from "./services/CreatePayment.service";
import { PaymentGrpcController } from "./payment.grpc.controller";
import { PaymentEventController } from "./payment.rmq.controller";
import { GrpcExceptionFilter } from "./services/rpc-exception.filter";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { OutboxRepository } from "./Repository/outbox.repository";
import { OutboxPublisher } from "./messaging/outbox.publisher";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ClientsModule.register([
      {
        name: "RMQ_CLIENT",
        transport: Transport.RMQ,
        options: {
          urls: ["amqp://localhost:5672"],
          exchange: "orderflow.events",
          exchangeType: "topic",
          queue: "payment-service.publisher.queue",
          queueOptions: { durable: true },
          persistent: true,
          wildcards: true,
        },
      },
    ]),
  ],
  controllers: [PaymentGrpcController, PaymentEventController],
  providers: [
    PrismaService,
    PaymentRepository,
    ConfirmPaymentService,
    GrpcExceptionFilter,
    CreatePaymentService,
    OutboxRepository,
    OutboxPublisher,
  ],
})
export class PaymentModule {}
