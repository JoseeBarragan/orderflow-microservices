import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { OrderModule } from "./order.module";
import { join } from "path";

async function bootstrap() {
  const app = await NestFactory.create(OrderModule);

  app.connectMicroservice({
    transport: Transport.GRPC,
    options: {
      package: "order",
      protoPath: join(__dirname, "..", "proto/order.proto"),
      url: "0.0.0.0:5006",
    },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || "amqp://localhost:5672"],
      exchange: "orderflow.events",
      exchangeType: "topic",
      queue: "order-service.stock-reject.queue",
      routingKey: "stock.reject",
      queueOptions: { durable: true },
    },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || "amqp://localhost:5672"],
      exchange: "orderflow.events",
      exchangeType: "topic",
      queue: "order-service.payment.queue",
      routingKey: "payment.*",
      queueOptions: { durable: true },
    },
  });

  app.enableShutdownHooks();

  await app.startAllMicroservices();
  await app.init();
}
void bootstrap();
