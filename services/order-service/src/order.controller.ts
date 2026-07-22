import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { OrderItems } from "./order.entity";
import { CreateOrderService } from "./services/CreateOrder.service";
import { GetAllOrdersService } from "./services/GetAllOrders.service";

@Controller()
export class OrderController {
  constructor(
    private readonly createOrderService: CreateOrderService,
    private readonly getAllOrdersService: GetAllOrdersService,
  ) {}

  @MessagePattern("order.create")
  async createOrder(@Payload() payload: { items: OrderItems[] }) {
    console.log("LLEGO EL MENSAJE", payload);
    return this.createOrderService.execute(payload.items);
  }

  @MessagePattern("order.getAll")
  async getAllOrders() {
    return this.getAllOrdersService.execute();
  }
}
