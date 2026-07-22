import { Module } from "@nestjs/common";
import { OrderController } from "./order.controller";
import { OrderService } from "./order.service";
import { PrismaService } from "./prisma.service";
import { OrderRepository } from "./order.repository";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [OrderController],
  providers: [OrderService, PrismaService, OrderRepository],
})
export class OrderModule {}
