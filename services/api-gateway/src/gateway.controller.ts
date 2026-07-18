import { Controller, Get } from '@nestjs/common';
import { GatewayService } from './gateway.service';

@Controller('api/inventory')
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Get()
  getInventory() {
    return this.gatewayService.send('inventory.get', {});
  }
}
