import { Body, Controller, Get, InternalServerErrorException, NotFoundException, Param, Post } from "@nestjs/common";
import { CreateOrderDto } from "./dto/order.dto";
import { lastValueFrom } from "rxjs";
import { status } from "@grpc/grpc-js";
import { PaymentGatewayService } from "./services/paymentClient.service";
import { OrderGatewayService } from "./services/OrderClient.service";

@Controller()
export class GatewayController {
  constructor(
    private readonly paymentService: PaymentGatewayService,
    private readonly orderService: OrderGatewayService,
  ) {}

  @Get("inventory")
  getInventory() {
    return;
  }

  @Post("order")
  createOrder(@Body() dto: CreateOrderDto) {
    return;
  }

  @Get("order/:id")
  getOrderById(@Param("id") id: string) {
    return lastValueFrom(this.orderService.GetOrderById(id));
  }

  @Post("order/:id/confirm-payment")
  confirmPayment(@Param("id") id: string) {
    return lastValueFrom(this.paymentService.confirmPayment(id)).catch(
      (err) => {

        if (err.code === status.NOT_FOUND) {
          throw new NotFoundException(err.details ?? "Pago no encontrado");
        }

        throw new InternalServerErrorException(
          err.details ?? "Error inesperado confirmando el pago",
        );
      },
    );
  }

  @Get("order")
  getAllOrders() {
    return lastValueFrom(this.orderService.GetAllOrders());
  }
}
