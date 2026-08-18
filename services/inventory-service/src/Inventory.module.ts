import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { GetAllProductsService } from "./services/GetAllProducts.service";
import { ReserveStockService } from "./services/ReserveStock.service";
import { PrismaService } from "./prisma.service";
import { OutboxPublisher } from "./messaging/outbox.publisher";
import { InventoryRepository } from "./Repository/Inventory.repository";
import { OutboxRepository } from "./Repository/Outbox.repository";
import { InventoryRmqController } from "./Inventory.rmq.controller";
import { InventoryGrpcController } from "./Inventory.grpc.controller";
import { ReleaseStockService } from "./services/ReleaseStock.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ClientsModule.register([
      {
        name: "RMQ_CLIENT",
        transport: Transport.RMQ,
        options: {
          urls: ["amqp://localhost:5672"],
          queue: "inventory-service.publisher.queue",
          queueOptions: { durable: true },
          exchange: "orderflow.events",
          wildcards: true,
          exchangeType: "topic",
          persistent: true,
        },
      },
    ]),
  ],
  controllers: [InventoryGrpcController, InventoryRmqController],
  providers: [
    GetAllProductsService,
    PrismaService,
    InventoryRepository,
    OutboxRepository,
    ReserveStockService,
    OutboxPublisher,
    ReleaseStockService,
  ],
})
export class InventoryModule {}
