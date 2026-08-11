import { Controller } from "@nestjs/common";
import { EventPattern, MessagePattern, Payload } from "@nestjs/microservices";
import { CreateOrderService } from "./services/CreateOrder.service";
import { GetAllOrdersService } from "./services/GetAllOrders.service";
import type { NewOrder, OrderItems } from "./types/order.entity";
import { CancelOrderService } from "./services/CancelOrder.service";
import { GetByIdService } from "./services/GetById.service";

@Controller("order")
export class OrderController {
  constructor(
    private readonly createOrderService: CreateOrderService,
    private readonly getAllOrdersService: GetAllOrdersService,
    private readonly cancelOrderService: CancelOrderService,
    private readonly getByIdService: GetByIdService,
  ) {}

  @MessagePattern("order.getById")
  async getOrder(@Payload() payload: string) {
    return await this.getByIdService.execute(payload);
  }

  @MessagePattern("order.create")
  async createOrder(@Payload() payload: { items: OrderItems[] }) {
    return await this.createOrderService.execute(payload.items);
  }

  @MessagePattern("order.getAll")
  async getAllOrders() {
    return await this.getAllOrdersService.execute();
  }

  // TODO: this shouldnt be here, must be deleted, but its going to be used as a way to track the hole flow
  @EventPattern("stock.reserve")
  async handleStockReserved(@Payload() payload: NewOrder) {
    console.log("Stock reservado para orden", payload.orderId);
    return await Promise.resolve();
  }

  @EventPattern("stock.reject")
  async handleStockRejected(
    @Payload() payload: { orderId: string; reason: string },
  ) {
    await this.cancelOrderService.execute(payload.orderId);
  }
}
