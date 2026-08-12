import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './services/gateway.service';
import { join } from "path";
import { PaymentGatewayService } from './services/paymentClient.service';

const protoPath = join(__dirname, "proto/payment.proto");

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'INVENTORY_SERVICE',
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3001 },
      },
      {
        name: 'ORDER_SERVICE',
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3002 },
      },
      {
        name: "PAYMENT_PACKAGE",
        transport: Transport.GRPC,
        options: {
          package: "payment",
          protoPath: protoPath,
          url: "localhost:5005"
        }
      }
    ]),
  ],
  controllers: [GatewayController],
  providers: [
    GatewayService,
    PaymentGatewayService,
  ],
})
export class AppModule {}
