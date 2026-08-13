import { Controller } from "@nestjs/common";
import { EventPattern, GrpcMethod, Payload } from "@nestjs/microservices";
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

  @GrpcMethod("OrderService")
  async getOrderById(data: { orderId: string }) {
    return await this.getByIdService.execute(data.orderId);
  }

  @GrpcMethod("OrderService")
  async createOrder(data: { items: OrderItems[] }) {
    return await this.createOrderService.execute(data.items);
  }

  @GrpcMethod("OrderService")
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
