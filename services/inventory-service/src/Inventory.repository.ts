import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { NewOrder, Product } from "./Inventory.types";
import { PrismaService } from "./prisma.service";

@Injectable()
export class InventoryRepository {
  private readonly logger = new Logger(InventoryRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(limit = 50, offset = 0): Promise<Product[]> {
    try {
      return await this.prisma.products.findMany({
        take: limit,
        skip: offset,
        orderBy: { created_at: "desc" },
      });
    } catch (err) {
      this.logger.error(`Error al buscar productos: ${err}`);
      throw new InternalServerErrorException("Error en el servidor, ", err);
    }
  }

  async findByIds(ids: string[]) {
    try {
      return await this.prisma.products.findMany({
        where: { id: { in: ids } },
      });
    } catch (err) {
      this.logger.error(`Error al buscar productos: ${err}`);
      throw new InternalServerErrorException("Error en el servidor, ", err);
    }
  }

  async reserveStock(order: NewOrder) {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.stock_reservations.createMany({
          data: order.items.map((i) => ({
            order_id: order.orderId,
            product_id: i.productId,
            quantity: i.quantity,
          })),
        });

        await tx.outbox_events.create({
          data: {
            event_type: "StockReserve",
            payload: {
              orderId: order.orderId,
              items: order.items,
              totalAmount: order.totalAmount,
            },
          },
        });
      });
      return;
    } catch (err) {
      this.logger.error(`Error al guardar el stock ${err}`);
      throw new InternalServerErrorException("Error en el servidor, ", err);
    }
  }

  async getPendingMessage() {
    try {
      return await this.prisma.outbox_events.findMany({
        where: { published: false },
        orderBy: { created_at: "asc" },
        take: 20,
      });
    } catch (err) {
      throw new InternalServerErrorException(
        `Ocurrio un error en el servicio de Prisma ${err}`,
      );
    }
  }

  async updateMessagePublish(id: string, Published: boolean) {
    try {
      return await this.prisma.outbox_events.update({
        where: { id: id },
        data: { published: Published, published_at: new Date() },
      });
    } catch (err) {
      throw new InternalServerErrorException(
        `Ocurrio un error en el servicio de Prisma ${err}`,
      );
    }
  }
}
