import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class GatewayService {
  constructor(
    @Inject('INVENTORY_SERVICE') private inventoryClient: ClientProxy,
  ) {}

  async send(pattern: string, payload: any) {
    return lastValueFrom(this.inventoryClient.send(pattern, payload));
  }
}