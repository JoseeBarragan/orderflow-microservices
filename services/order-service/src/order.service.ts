import { Injectable } from "@nestjs/common";
import { OrderRepository } from "./order.repository";
import { OrderItems } from "./order.entity";

@Injectable()
export class OrderService {
  constructor(private readonly orderRepository: OrderRepository) {}

  async CreateOrder(items: OrderItems[]) {
    const total = items.reduce(
      (accum, item) => accum + item.unitPrice * item.quantity,
      0,
    );

    return await this.orderRepository.create(total, items);
  }
}
