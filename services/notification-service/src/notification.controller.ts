import { Controller, Logger } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";

@Controller()
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  @EventPattern("order.created")
  handleOrderCreated(@Payload() payload: { orderId: string }) {
    this.logger.log(`📦 Orden creada: ${payload.orderId}`);
  }

  @EventPattern("stock.reserve")
  handleStockReserved(@Payload() payload: { orderId: string }) {
    this.logger.log(`✅ Stock reservado: ${payload.orderId}`);
  }

  @EventPattern("stock.rejected")
  handleStockRejected(@Payload() payload: { orderId: string; reason: string }) {
    this.logger.log(`❌ Sin stock: ${payload.orderId} - ${payload.reason}`);
  }

  @EventPattern("payment.approved")
  handlePaymentApproved(@Payload() payload: { orderId: string }) {
    this.logger.log(`💳 Pago aprobado: ${payload.orderId}`);
  }

  @EventPattern("payment.failed")
  handlePaymentFailed(@Payload() payload: { orderId: string }) {
    this.logger.log(`⚠️ Pago falló: ${payload.orderId}`);
  }
}
