import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { InventoryModule } from "./Inventory.module";

async function bootstrap() {
  const app = await NestFactory.create(InventoryModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: "localhost", port: 3001 },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: ["amqp://localhost:5672"],
      exchange: "orderflow.events",
      exchangeType: "topic",
      queue: "inventory-service.consumer.queue",
      routingKey: "order.created",
      queueOptions: { durable: true },
    },
  });

  await app.startAllMicroservices();
  await app.init();
}
bootstrap();
