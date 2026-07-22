import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { OrderItems } from "./order.entity";

@Injectable()
export class OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

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
            eventType: "OrderCreated",
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
}
