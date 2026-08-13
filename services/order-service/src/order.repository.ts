import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { OrderItems, OrderStatus } from "./types/order.entity";
import { RpcException } from "@nestjs/microservices";
import { status } from "@grpc/grpc-js";

@Injectable()
export class OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string) {
    try {
      return await this.prisma.order.findUnique({
        where: { orderId: id },
        include: { items: true },
      });
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

      return {
        orders: orders.map((order) => ({
          orderId: order.orderId,
          totalAmount: Number(order.totalAmount),
          items: order.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
          })),
        })),
      };
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
      throw new ServiceUnavailableException(
        `Ocurrio un error en el servicio de Prisma ${err}`,
      );
    }
  }

  async updateStatusOrder(orderId: string, status: OrderStatus) {
    try {
      return await this.prisma.order.update({
        where: { orderId: orderId },
        data: {
          status: status,
        },
      });
    } catch (err) {
      throw new ServiceUnavailableException(
        `Ocurrio un error en el servicio de Prisma ${err}`,
      );
    }
  }

  async getPendingMessage() {
    try {
      return await this.prisma.outboxEvent.findMany({
        where: { published: false },
        orderBy: { createdAt: "asc" },
        take: 20,
      });
    } catch (err) {
      throw new ServiceUnavailableException(
        `Ocurrio un error en el servicio de Prisma ${err}`,
      );
    }
  }

  async updateMessagePublish(id: string, Published: boolean) {
    try {
      return await this.prisma.outboxEvent.update({
        where: { id: id },
        data: { published: Published, publishedAt: new Date() },
      });
    } catch (err) {
      throw new ServiceUnavailableException(
        `Ocurrio un error en el servicio de Prisma ${err}`,
      );
    }
  }
}
