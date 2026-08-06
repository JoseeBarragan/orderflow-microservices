import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { Product } from "./Inventory.types";
import { PrismaService } from "./prisma.service";

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(limit = 50, offset = 0): Promise<Product[]> {
    try {
      return await this.prisma.products.findMany({
        take: limit,
        skip: offset,
        orderBy: { created_at: "desc" },
      });
    } catch (err) {
      throw new ServiceUnavailableException("Error en prisma, ", err);
    }
  }
}
