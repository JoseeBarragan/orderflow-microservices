import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { lastValueFrom } from "rxjs";

@Injectable()
export class GatewayService {
  private clients: Map<string, ClientProxy>;

  constructor(
    @Inject("INVENTORY_SERVICE") private inventoryClient: ClientProxy,
    @Inject("ORDER_SERVICE") private ordersClient: ClientProxy,
  ) {
    this.clients = new Map([
      ["INVENTORY", inventoryClient],
      ["ORDERS", ordersClient],
    ]);
  }

  async send(
    service: "INVENTORY" | "ORDERS" | "PAYMENT",
    pattern: string,
    payload: any,
  ) {
    const client = this.clients.get(service);
    if (!client) throw new NotFoundException("Servicio no encontrado");

    try {
      return await lastValueFrom(client.send(pattern, payload));
    } catch (err) {
      console.error("Error real del microservicio:", err); // acá vas a ver el detalle
      throw err;
    }
  }
}
