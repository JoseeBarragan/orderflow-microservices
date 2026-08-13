import { Injectable } from "@nestjs/common";
import { OrderRepository } from "../order.repository";

@Injectable()
export class GetAllOrdersService {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute() {
    return await this.orderRepository.getAll();
  }
}
