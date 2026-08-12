import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { lastValueFrom } from "rxjs";

const EXCEPTION_MAP: Record<number, new (msg: string) => any> = {
  404: NotFoundException,
  400: BadRequestException,
  409: ConflictException,
};

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
      return lastValueFrom(client.send(pattern, payload));
    } catch (err) {
      console.error("Error real del microservicio:", err);

      const ExceptionClass =
        EXCEPTION_MAP[err?.status] ?? InternalServerErrorException;
      throw new ExceptionClass(err?.message ?? "Error inesperado");
    }
  }
}
