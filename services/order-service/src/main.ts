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
      urls: ["amqp://localhost:5672"],
      exchange: "orderflow.events",
      exchangeType: "topic",
      queue: "order-service.consumer.queue",
      routingKey: "stock.*",
      wildcards: true,
      queueOptions: { durable: true },
    },
  });

  await app.startAllMicroservices();
  await app.init();
}
bootstrap();
