import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { Observable } from "rxjs";

export interface ProductResponse {
  id: string;
  name: string; 
  unitPriceCents: number;
  available_stock: number;
}

interface InventoryClientService {
  getAll(data: { limit: number, offset: number }): Observable<ProductResponse>;
}

@Injectable()
export class InventoryGatewayService implements OnModuleInit {
  private inventoryClientService: InventoryClientService;

  constructor(@Inject("INVENTORY_PACKAGE") private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.inventoryClientService =
      this.client.getService<InventoryClientService>("InventoryService");
  }

  getAll(limit: number, offset: number) {
    return this.inventoryClientService.getAll({ limit, offset });
  }
}
