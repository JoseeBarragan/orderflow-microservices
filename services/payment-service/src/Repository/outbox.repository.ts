import { status } from "@grpc/grpc-js";
import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { PrismaService } from "src/prisma.service";

@Injectable()
export class OutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getPendingMessages() {
    try {
      return await this.prisma.outboxEvent.findMany({
        where: { published: false },
        orderBy: { createdAt: "asc" },
        take: 20,
      });
    } catch (err) {
      throw new RpcException({
        code: status.INTERNAL,
        message: `Ocurrio un error en el servicio de Prisma ${err}`,
      });
    }
  }

  async updateMessagePublish(id: string, published: boolean) {
    try {
      return await this.prisma.outboxEvent.update({
        where: { id: id },
        data: { published, publishedAt: new Date() },
      });
    } catch (err) {
      throw new RpcException({
        code: status.INTERNAL,
        message: `Ocurrio un error en el servicio de Prisma ${err}`,
      });
    }
  }
}
