import { Controller } from "@nestjs/common";
import { OrderService } from "./order.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { OrderItems } from "./order.entity";

@Controller()
export class OrderController {
  constructor(private readonly appService: OrderService) {}

  @MessagePattern("order.create")
  async createOrder(@Payload() payload: { items: OrderItems[] }) {
    return this.appService.CreateOrder(payload.items);
  }
}
