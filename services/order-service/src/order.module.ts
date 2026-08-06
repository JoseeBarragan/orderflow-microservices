import { Module } from "@nestjs/common";
import { OrderController } from "./order.controller";
import { PrismaService } from "./prisma.service";
import { OrderRepository } from "./order.repository";
import { ConfigModule } from "@nestjs/config";
import { CreateOrderService } from "./services/CreateOrder.service";
import { GetAllOrdersService } from "./services/GetAllOrders.service";
import { OutboxPublisher } from "./messaging/outbox.publisher";
import { ClientsModule, Transport } from "@nestjs/microservices";

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
          routingKey: "order.created",
          queue: "order-service.publisher.queue",
          queueOptions: { durable: true },
          persistent: true,
          wildcards: true,
        },
      },
    ]),
  ],
  controllers: [OrderController],
  providers: [
    CreateOrderService,
    PrismaService,
    OrderRepository,
    GetAllOrdersService,
    OutboxPublisher,
  ],
})
export class OrderModule {}
