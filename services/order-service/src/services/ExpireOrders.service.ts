import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { OrderRepository } from "src/Repository/order.repository";

const STALE_AFTER_MS = 15 * 60 * 1000;
const SWEEP_EVERY_MS = 60 * 1000;

@Injectable()
export class ExpireOrdersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExpireOrdersService.name);
  private timer: ReturnType<typeof setInterval>;

  constructor(private readonly orderRepository: OrderRepository) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.sweep();
    }, SWEEP_EVERY_MS);
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  async sweep() {
    const olderThan = new Date(Date.now() - STALE_AFTER_MS);
    const orders = await this.orderRepository.findStalePending(olderThan);

    for (const order of orders) {
      try {
        const cancelled = await this.orderRepository.cancelIfPendingAndEmit(
          order.orderId,
        );

        if (cancelled)
          this.logger.warn(
            `Orden ${order.orderId} cancelada por abandono, se libera el stock reservado`,
          );
      } catch (err) {
        this.logger.error(
          `No se pudo expirar la orden ${order.orderId}: ${err}`,
        );
      }
    }
  }
}
