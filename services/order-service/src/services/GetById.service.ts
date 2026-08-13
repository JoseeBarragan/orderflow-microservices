import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { status } from "@grpc/grpc-js";
import { OrderRepository } from "src/Repository/order.repository";

@Injectable()
export class GetByIdService {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(id: string) {
    const order = await this.orderRepository.getById(id);
    if (!order) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: "Order Not Found",
      });
    }

    return order;
  }
}
