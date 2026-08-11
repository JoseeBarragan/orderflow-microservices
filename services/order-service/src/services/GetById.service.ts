import { Injectable } from "@nestjs/common";
import { OrderRepository } from "src/order.repository";
import { RpcException } from "@nestjs/microservices";

@Injectable()
export class GetByIdService {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(id: string) {
    const order = await this.orderRepository.getById(id);
    if (!order) {
      throw new RpcException({ status: 404, message: "Order Not Found" });
    }

    return order;
  }
}
