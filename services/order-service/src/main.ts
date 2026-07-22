import { NestFactory } from "@nestjs/core";
import { Transport, MicroserviceOptions } from "@nestjs/microservices";
import { OrderModule } from "./order.module";

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    OrderModule,
    {
      transport: Transport.TCP,
      options: {
        host: "localhost",
        port: 3002,
      },
    },
  );

  app.useGlobalPipes()

  await app.listen();
}
bootstrap();
