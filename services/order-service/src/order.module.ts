import { Module } from "@nestjs/common";
import { OrderController } from "./order.controller";
import { PrismaService } from "./prisma.service";
import { OrderRepository } from "./order.repository";
import { ConfigModule } from "@nestjs/config";
import { CreateOrderService } from "./services/CreateOrder.service";
import { GetAllOrdersService } from "./services/GetAllOrders.service";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [OrderController],
  providers: [
    CreateOrderService,
    PrismaService,
    OrderRepository,
    GetAllOrdersService,
  ],
})
export class OrderModule {}
