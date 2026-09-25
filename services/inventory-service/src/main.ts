import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { InventoryModule } from "./Inventory.module";
import { join } from "path";

async function bootstrap() {
  const app = await NestFactory.create(InventoryModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: "inventory",
      protoPath: join(__dirname, "..", "proto/inventory.proto"),
      url: "0.0.0.0:5005",
    },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || "amqp://localhost:5672"],
      exchange: "orderflow.events",
      exchangeType: "topic",
      queue: "inventory-service.order-created.queue",
      routingKey: "order.created",
      queueOptions: { durable: true },
    },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || "amqp://localhost:5672"],
      exchange: "orderflow.events",
      exchangeType: "topic",
      queue: "inventory-service.payment-failed.queue",
      routingKey: "payment.failed",
      queueOptions: { durable: true },
    },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || "amqp://localhost:5672"],
      exchange: "orderflow.events",
      exchangeType: "topic",
      queue: "inventory-service.order-cancelled.queue",
      routingKey: "order.cancelled",
      queueOptions: { durable: true },
    },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || "amqp://localhost:5672"],
      exchange: "orderflow.events",
      exchangeType: "topic",
      queue: "inventory-service.payment-approved.queue",
      routingKey: "payment.approved",
      queueOptions: { durable: true },
    },
  });

  await app.startAllMicroservices();
  await app.init();
}
void bootstrap();
