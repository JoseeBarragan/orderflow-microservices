import { Module } from "@nestjs/common";
import { PaymentController } from "./payment.controller";
import { PrismaService } from "./prisma.service";

@Module({
  imports: [],
  controllers: [PaymentController],
  providers: [PrismaService],
})
export class PaymentModule {}
