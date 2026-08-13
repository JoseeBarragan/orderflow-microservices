import { Controller, UseFilters } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { CreateOrderService } from "./services/CreateOrder.service";
import { GetAllOrdersService } from "./services/GetAllOrders.service";
import type { OrderItems } from "./types/order.entity";
import { GetByIdService } from "./services/GetById.service";
import { GrpcExceptionFilter } from "./services/error/rpc-exception.filter";

@UseFilters(new GrpcExceptionFilter())
@Controller("order")
export class OrderGrpcController {
  constructor(
    private readonly createOrderService: CreateOrderService,
    private readonly getAllOrdersService: GetAllOrdersService,
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
}
