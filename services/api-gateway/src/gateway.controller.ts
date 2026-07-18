import { Controller, Get } from '@nestjs/common';
import { GatewayService } from './gateway.service';

@Controller()
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Get()
  grettings(){
    return "Hello world"
  }

  @Get("inventory")
  getInventory() {
    return this.gatewayService.send('inventory.get', {});
  }
}
