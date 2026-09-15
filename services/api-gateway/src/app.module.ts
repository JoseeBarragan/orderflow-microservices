import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { GatewayController } from './gateway.controller';
import { join } from "path";
import { PaymentGatewayService } from './services/paymentClient.service';
import { OrderGatewayService } from './services/OrderClient.service';
import { InventoryGatewayService } from './services/InventoryClient.service';
import { ThrottlerModule } from '@nestjs/throttler';

const protoPath = (service: string) =>  {return join(__dirname, `proto/${service}.proto`)};

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    ClientsModule.register([
      {
        name: "INVENTORY_PACKAGE",
        transport: Transport.GRPC,
        options: {
          package: "inventory",
          protoPath: protoPath("inventory"),
          url: process.env.INVENTORY_URL || "localhost:5005",
        },
      },
      {
        name: "ORDER_PACKAGE",
        transport: Transport.GRPC,
        options: { 
          package: "order",
          protoPath: protoPath("order"),
          url: process.env.ORDER_URL || "localhost:5006" 
        },
      },
      {
        name: "PAYMENT_PACKAGE",
        transport: Transport.GRPC,
        options: {
          package: "payment",
          protoPath: protoPath("payment"),
          url: process.env.PAYMENT_URL || "localhost:5007"
        }
      }
    ]),
  ],
  controllers: [GatewayController],
  providers: [
    PaymentGatewayService,
    OrderGatewayService,
    InventoryGatewayService,
  ],
})
export class AppModule {}
