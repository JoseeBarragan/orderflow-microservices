import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import type { CreateOrderDto } from './dto/order.dto';

@Controller()
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}
  
  @Get("inventory")
  getInventory() {
    return this.gatewayService.send("INVENTORY", 'inventory.get', {});
  }

  @Post("order")
  createOrder(@Body() items: CreateOrderDto){
    return this.gatewayService.send("ORDERS", 'order.create', items)
  }

  @Get("order")
  getAllOrders(){
    return this.gatewayService.send("ORDERS", "order.getAll", {})
  }

  @Delete("order/:id")
  deleteOrder(@Param() id: string ) {
    return this.gatewayService.send("ORDERS", "order.delete", id)
  }
}
