import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { ConfigModule } from "@nestjs/config";
import { CreateOrderService } from "./services/CreateOrder.service";
import { GetAllOrdersService } from "./services/GetAllOrders.service";
import { OutboxPublisher } from "./messaging/outbox.publisher";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { CancelOrderService } from "./services/CancelOrder.service";
import { GetByIdService } from "./services/GetById.service";
import { OrderRepository } from "./Repository/order.repository";
import { OutboxRepository } from "./Repository/outbox.repository";
import { OrderEventController } from "./order.rmq.controller";
import { OrderGrpcController } from "./order.grpc.controller";

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
          queue: "order-service.publisher.queue",
          queueOptions: { durable: true },
          persistent: true,
          wildcards: true,
        },
      },
    ]),
  ],
  controllers: [OrderEventController, OrderGrpcController],
  providers: [
    CreateOrderService,
    PrismaService,
    OrderRepository,
    OutboxRepository,
    GetAllOrdersService,
    OutboxPublisher,
    CancelOrderService,
    GetByIdService,
  ],
})
export class OrderModule {}
