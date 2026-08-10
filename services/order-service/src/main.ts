import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { OrderModule } from "./order.module";

async function bootstrap() {
  const app = await NestFactory.create(OrderModule);

  app.connectMicroservice({
    transport: Transport.TCP,
    options: { host: "localhost", port: 3002 },
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
