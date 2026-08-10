import { Controller } from "@nestjs/common";
import { EventPattern, MessagePattern, Payload } from "@nestjs/microservices";
import { CreateOrderService } from "./services/CreateOrder.service";
import { GetAllOrdersService } from "./services/GetAllOrders.service";
import { NewOrder, OrderItems } from "./types/order.entity";
import { CancelOrderService } from "./services/CancelOrder.service";

@Controller()
export class OrderController {
  constructor(
    private readonly createOrderService: CreateOrderService,
    private readonly getAllOrdersService: GetAllOrdersService,
    private readonly cancelOrderService: CancelOrderService,
  ) {}

  @MessagePattern("order.create")
  async createOrder(@Payload() payload: { items: OrderItems[] }) {
    return this.createOrderService.execute(payload.items);
  }

  @MessagePattern("order.getAll")
  async getAllOrders() {
    return this.getAllOrdersService.execute();
  }

  @EventPattern("stock.*")
  async rollbackOrder(
    @Payload() payload: NewOrder | { orderId: string; reason: string },
  ) {
    if ("reason" in payload) {
      await this.cancelOrderService.execute(payload.orderId);
    } else {
      console.log(payload.items);
    }
    return;
  }
}
