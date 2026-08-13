import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { Observable } from "rxjs";
import { CreateOrderDto } from "src/dto/order.dto";

type OrderItems = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

type Order = {
  orderId: string;
  totalAmount: number;
  items: OrderItems[];
};

interface OrderClientService {
  GetOrderById(data: { orderId: string }): Observable<Order>;
  GetAllOrders({}): Observable<Order[]>;
  CreateOrder(data: CreateOrderDto): Observable<Order>;
}

@Injectable()
export class OrderGatewayService implements OnModuleInit {
  private orderClientService: OrderClientService;

  constructor(@Inject("ORDER_PACKAGE") private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.orderClientService =
      this.client.getService<OrderClientService>("OrderService");
  }

  GetOrderById(orderId: string) {
    return this.orderClientService.GetOrderById({ orderId });
  }
  GetAllOrders() {
    return this.orderClientService.GetAllOrders({});
  }
  CreateOrder(items: CreateOrderDto) {
    return this.orderClientService.CreateOrder(items);
  }
}
