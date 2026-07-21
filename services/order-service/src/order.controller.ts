import { Controller } from "@nestjs/common";
import { OrderService } from "./order.service";
import { MessagePattern } from "@nestjs/microservices";

@Controller()
export class OrderController {
  constructor(private readonly appService: OrderService) {}

  @MessagePattern("order.get")
  getHello(): string {
    return this.appService.getHello();
  }
}
