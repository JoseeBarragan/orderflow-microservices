import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Query,
  UnprocessableEntityException,
} from "@nestjs/common";
import { CreateOrderDto } from "./dto/order.dto";
import { lastValueFrom } from "rxjs";
import { status } from "@grpc/grpc-js";
import { PaymentGatewayService } from "./services/paymentClient.service";
import { OrderGatewayService } from "./services/OrderClient.service";
import { InventoryGatewayService } from "./services/InventoryClient.service";

@Controller()
export class GatewayController {
  constructor(
    private readonly paymentService: PaymentGatewayService,
    private readonly orderService: OrderGatewayService,
    private readonly inventoryService: InventoryGatewayService,
  ) {}

  @Get("inventory")
  async getInventory(@Query() query: { limit: string; offset: string }) {
    const limit = query.limit ? Number(query.limit) : 50;
    const offset = query.offset ? Number(query.offset) : 0;
    return lastValueFrom(this.inventoryService.getAll(limit, offset)).catch(
      (err) => {
        throw new InternalServerErrorException(
          err.message ?? "Error inesperado en el servidor",
        );
      },
    );
  }

  @Post("order")
  async createOrder(@Body() dto: CreateOrderDto) {
    return lastValueFrom(this.orderService.CreateOrder(dto)).catch((err) => {
      if (err.code === status.NOT_FOUND) {
        throw new NotFoundException(err.message ?? "Ordern no encontrada");
      }

      throw new InternalServerErrorException(
        err.message ?? "Error inesperado en el servidor",
      );
    });
  }

  @Get("order/:id")
  async getOrderById(@Param("id") id: string) {
    return lastValueFrom(this.orderService.GetOrderById(id)).catch((err) => {
      if (err.code === status.NOT_FOUND) {
        throw new NotFoundException(err.message ?? "Ordern no encontrada");
      }

      throw new InternalServerErrorException(
        err.message ?? "Error inesperado en el servidor",
      );
    });
  }

  @Post("order/:id/confirm-payment")
  async confirmPayment(@Param("id") id: string) {
    return lastValueFrom(this.paymentService.confirmPayment(id)).catch(
      (err) => {
        if (err.code === status.NOT_FOUND) {
          throw new NotFoundException(err.message ?? "Pago no encontrado");
        }
        if(err.code === status.ABORTED) {
          throw new UnprocessableEntityException("Error a la hora de realizar el pago, vuelva a intentarlo")
        }

        throw new InternalServerErrorException(
          err.message ?? "Error inesperado confirmando el pago",
        );
      },
    );
  }

  @Get("order")
  async getAllOrders() {
    return lastValueFrom(this.orderService.GetAllOrders()).catch((err) => {
      if (err.code === status.NOT_FOUND) {
        throw new NotFoundException(err.message ?? "Ordern no encontrada");
      }

      throw new InternalServerErrorException(
        err.message ?? "Error inesperado en el servidor",
      );
    });
  }
}
