import { NestFactory } from "@nestjs/core";
import { PaymentModule } from "./payment.module";
import { Transport } from "@nestjs/microservices";
import { join } from "path";

async function bootstrap() {
  const app = await NestFactory.create(PaymentModule);

  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: ["amqp://localhost:5672"],
      exchange: "orderflow.events",
      exchangeType: "topic",
      queue: "payment-service.consumer.queue",
      routingKey: "",
      wildcards: true,
      queueOptions: { durable: true },
    },
  });

  app.connectMicroservice({
    transport: Transport.GRPC,
    options: {
      package: "payment",
      protoPath: join(__dirname, "..", "proto/payment.proto"),
      url: "0.0.0.0:5007",
    },
  });

  await app.startAllMicroservices();
  await app.init();
}
bootstrap();
