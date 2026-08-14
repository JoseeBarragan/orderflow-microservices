import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { GetAllReturnType, NewOrder } from "../types/Inventory.types";
import { StockUnavailableError } from "../types/Error.types";
import { RpcException } from "@nestjs/microservices";
import { status } from "@grpc/grpc-js";

@Injectable()
export class InventoryRepository {
  private readonly logger = new Logger(InventoryRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(limit = 50, offset = 0): Promise<GetAllReturnType> {
    try {
      const products = await this.prisma.products.findMany({
        take: limit,
        skip: offset,
        orderBy: { created_at: "desc" },
      });
      return {
        items: products.map((product) => ({
          id: product.id,
          name: product.name,
          unitPriceCents: Math.round(Number(product.unitPrice) * 100),
          availableStock: product.available_stock,
        })),
      };
    } catch (err) {
      this.logger.error(`Error al buscar productos: ${err}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: `Error en el servsdor, ${err}`,
      });
    }
  }

  async findByIds(ids: string[]) {
    try {
      return await this.prisma.products.findMany({
        where: { id: { in: ids } },
      });
    } catch (err) {
      this.logger.error(`Error al buscar productos: ${err}`);
      throw err;
    }
  }

  async reserveStock(
    order: NewOrder,
  ): Promise<{ success: true } | { success: false; reason: string }> {
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          const result = await tx.products.updateMany({
            where: {
              id: item.productId,
              available_stock: { gte: item.quantity },
            },
            data: {
              available_stock: { decrement: item.quantity },
              reserved_stock: { increment: item.quantity },
            },
          });

          if (result.count === 0)
            throw new StockUnavailableError(item.productId);
        }

        await tx.stock_reservations.createMany({
          data: order.items.map((i) => ({
            order_id: order.orderId,
            product_id: i.productId,
            quantity: i.quantity,
          })),
        });

        await tx.outbox_events.create({
          data: {
            event_type: "stock.reserve",
            payload: {
              orderId: order.orderId,
              items: order.items,
              totalAmount: order.totalAmount,
            },
          },
        });
      });
      return { success: true };
    } catch (err) {
      if (err instanceof StockUnavailableError) {
        return { success: false, reason: err.message };
      }
      this.logger.error(`Error al guardar el stock ${err}`);
      throw err;
    }
  }
}
