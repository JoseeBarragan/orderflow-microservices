import { Injectable } from "@nestjs/common";
import { OrderRepository } from "src/Repository/order.repository";
import { OrderItems } from "src/types/order.entity";

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
