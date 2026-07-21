import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { InventoryModule } from "./Inventory.module";

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    InventoryModule,
    {
      transport: Transport.TCP,
      options: {
        host: "localhost",
        port: 3001,
      },
    },
  );
  await app.listen();
}
bootstrap();
