import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { OrderItems, OrderStatus } from "./types/order.entity";

@Injectable()
export class OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string) {
    try {
      return await this.prisma.order.findUnique({ where: { id: id } });
    } catch (err) {
      throw new ServiceUnavailableException(
        `Ocurrio un error en el servicio de Prisma ${err}`,
      );
    }
  }

  async getAll() {
    try {
      return await this.prisma.order.findMany();
    } catch (err) {
      throw new ServiceUnavailableException(
        `Ocurrio un error en el servicio de Prisma ${err}`,
      );
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
              orderId: order.id,
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
        where: { id: orderId },
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
