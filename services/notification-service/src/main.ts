import { NestFactory } from "@nestjs/core";
import { AppModule } from "./notification.module";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: ["amqp://localhost:5672"],
      exchange: "orderflow.events",
      exchangeType: "topic",
      queue: "notification-service.queue",
      routingKey: "#",
      wildcards: true,
      queueOptions: { durable: true },
    },
  });

  await app.startAllMicroservices();
}
bootstrap();
