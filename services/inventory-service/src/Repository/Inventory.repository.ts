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
        message: `Error en el servidor, ${err}`,
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
      const items = [...order.items].sort((a, b) =>
        a.productId.localeCompare(b.productId),
      );
      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.stock_reservations.findMany({
          where: { order_id: order.orderId },
        });

        if (existing.length > 0) return;

        for (const item of items) {
          if (!Number.isInteger(item.quantity) || item.quantity <= 0)
            throw new Error(
              `Error a la hora de verificar la cantidad ingresada del producto: ${item.productId}`,
            );

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

  async releaseStock(orderId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const reservations = await tx.stock_reservations.findMany({
          where: { order_id: orderId, released: false },
        });

        if (reservations.length === 0) {
          this.logger.warn(
            `No se encontraron reservas activas para la orden ${orderId}`,
          );
          return;
        }

        for (const reservation of reservations) {
          const claimed = await tx.stock_reservations.updateMany({
            where: { id: reservation.id, released: false },
            data: { released: true },
          });

          if (claimed.count === 0) {
            this.logger.warn(`Reserva ${reservation.id} ya liberada, se omite`);
            continue;
          }

          await tx.products.update({
            where: { id: reservation.product_id, available_stock: { gte: 0 } },
            data: {
              available_stock: { increment: reservation.quantity },
              reserved_stock: { decrement: reservation.quantity },
            },
          });
        }
      });
    } catch (err) {
      this.logger.error(`Error al buscar productos: ${err}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: `Error en el servidor, ${err}`,
      });
    }
  }
}
