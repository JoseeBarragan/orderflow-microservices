import { Module } from "@nestjs/common";
import { InventoryController } from "./Inventory.controller";
import { InventoryRepository } from "./Inventory.repository";
import { ConfigModule } from "@nestjs/config";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { GetAllProductsService } from "./services/GetAllProducts.service";
import { ReserveStockService } from "./services/ReserveStock.service";
import { PrismaService } from "./prisma.service";
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
          queue: "inventory-service.publisher.queue",
          queueOptions: { durable: true },
          routingKey: "stock.reserve",
          exchange: "orderflow.events",
          exchangeType: "topic",
          persistent: true,
        },
      },
    ]),
  ],
  controllers: [InventoryController],
  providers: [
    GetAllProductsService,
    PrismaService,
    InventoryRepository,
    ReserveStockService,
    OutboxPublisher,
  ],
})
export class InventoryModule {}
