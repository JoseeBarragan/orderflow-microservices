import { Injectable } from "@nestjs/common";
import { OrderRepository } from "src/Repository/order.repository";

@Injectable()
export class ConfirmOrderService {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(orderId: string) {
    return await this.orderRepository.updateStatusIfPending(
      orderId,
      "CONFIRMED",
    );
  }
}
