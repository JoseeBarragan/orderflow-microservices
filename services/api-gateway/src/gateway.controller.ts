import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { CreateOrderDto } from './dto/order.dto';

@Controller()
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}
  
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


  @Get("order")
  getAllOrders(){
    return this.gatewayService.send("ORDERS", "order.getAll", {})
  }
}
