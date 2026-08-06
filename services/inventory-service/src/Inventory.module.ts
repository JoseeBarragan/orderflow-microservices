import { Module } from "@nestjs/common";
import { InventoryController } from "./Inventory.controller";
import { PgService } from "./Pg.service";
import { InventoryRepository } from "./Inventory.repository";
import { ConfigModule } from "@nestjs/config";
import { InventoryService } from "./services/Inventory.service";
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
          queue: "inventory-service.publisher.queue",
          queueOptions: { durable: true },
          exchange: "orderflow.events",
          exchangeType: "topic",
          persistent: true,
        },
      },
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService, PgService, InventoryRepository],
})
export class InventoryModule {}
