import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateOrderDto } from './dto/order.dto';
import { GatewayService } from './services/gateway.service';
import { lastValueFrom } from 'rxjs';
import { PaymentGatewayService } from './services/paymentClient.service';

@Controller()
export class GatewayController {
  constructor(
    private readonly gatewayService: GatewayService,
    private readonly paymentService: PaymentGatewayService,
  ) {}
  
  @Get("inventory")
  getInventory() {
    return this.gatewayService.send("INVENTORY", 'inventory.get', {});
  }

  @Post("order")
  createOrder(@Body() dto: CreateOrderDto){
    return this.gatewayService.send("ORDERS", 'order.create', dto)
  }

  @Get("order/:id")
  getOrderById(@Param("id") id:string){
    return this.gatewayService.send("ORDERS", "order.getById", id)
  }

  @Post("order/:id/confirm-payment")
  confirmPayment(@Param("id") id: string){
    return lastValueFrom(this.paymentService.confirmPayment(id));
  }

  @Get("order")
  getAllOrders(){
    return this.gatewayService.send("ORDERS", "order.getAll", {})
  }
}
