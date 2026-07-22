import { Injectable } from "@nestjs/common";
import { OrderItems } from "src/order.entity";
import { OrderRepository } from "src/order.repository";

@Injectable()
export class CreateOrderService {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(items: OrderItems[]) {
    const total = items.reduce(
      (accum, item) => accum + item.unitPrice * item.quantity,
      0,
    );

    return await this.orderRepository.create(total, items);
  }
}
