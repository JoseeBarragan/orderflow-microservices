import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { OrderItems, OrderStatus } from "../types/order.entity";
import { RpcException } from "@nestjs/microservices";
import { status } from "@grpc/grpc-js";
import type { Prisma } from "@prisma/client";

type OrderWithItems = Prisma.OrderGetPayload<{ include: { items: true } }>;

@Injectable()
export class OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toOrder(order: OrderWithItems) {
    return {
      orderId: order.orderId,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      items: order.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      })),
    };
  }

  async getById(id: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { orderId: id },
        include: { items: true },
      });

      return order ? this.toOrder(order) : null;
    } catch (err) {
      throw new RpcException({
        code: status.INTERNAL,
        message: `Ocurrio un error en el servicio de Prisma ${err}`,
      });
    }
  }

  async getAll() {
    try {
      const orders = await this.prisma.order.findMany({
        include: { items: true },
      });

      return { orders: orders.map((order) => this.toOrder(order)) };
    } catch (err) {
      throw new RpcException({
        code: status.INTERNAL,
        message: `Ocurrio un error en el servicio de Prisma ${err}`,
      });
    }
  }

  async create(total: number, newItems: OrderItems[]) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            totalAmount: total,
            items: {
              create: newItems,
            },
          },
          include: { items: true },
        });

        await tx.outboxEvent.create({
          data: {
            eventType: "order.created",
            payload: {
              orderId: order.orderId,
              items: newItems,
              totalAmount: total,
            },
          },
        });

        return order;
      });
    } catch (err) {
      throw new RpcException({
        code: status.INTERNAL,
        message: `Ocurrio un error en el servicio de Prisma ${err}`,
      });
    }
  }

  async updateStatusIfPending(
    orderId: string,
    orderStatus: OrderStatus,
  ): Promise<boolean> {
    try {
      const { count } = await this.prisma.order.updateMany({
        where: { orderId, status: "PENDING" },
        data: { status: orderStatus },
      });

      return count > 0;
    } catch (err) {
      throw new RpcException({
        code: status.INTERNAL,
        message: `Ocurrio un error en el servicio de Prisma ${err}`,
      });
    }
  }

  async findStalePending(olderThan: Date) {
    try {
      return await this.prisma.order.findMany({
        where: { status: "PENDING", createdAt: { lt: olderThan } },
      });
    } catch (err) {
      throw new RpcException({
        code: status.INTERNAL,
        message: `Ocurrio un error en el servicio de Prisma ${err}`,
      });
    }
  }

  async cancelIfPendingAndEmit(orderId: string): Promise<boolean> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const { count } = await tx.order.updateMany({
          where: { orderId, status: "PENDING" },
          data: { status: "CANCELLED" },
        });

        if (count === 0) return false;

        await tx.outboxEvent.create({
          data: {
            eventType: "order.cancelled",
            payload: { orderId },
          },
        });

        return true;
      });
    } catch (err) {
      throw new RpcException({
        code: status.INTERNAL,
        message: `Ocurrio un error en el servicio de Prisma ${err}`,
      });
    }
  }
}
