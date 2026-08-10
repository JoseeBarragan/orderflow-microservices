import { Injectable } from "@nestjs/common";
import { OrderRepository } from "../order.repository";

@Injectable()
export class CancelOrderService {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(orderId: string) {
    return await this.orderRepository.cancelOrder(orderId);
  }
}
