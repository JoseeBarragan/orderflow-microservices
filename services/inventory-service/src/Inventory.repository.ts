import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { Product } from "./Inventory.types";
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
      throw new InternalServerErrorException("Error en prisma, ", err);
    }
  }

  async findByIds(ids: string[]) {
    try {
      return await this.prisma.products.findMany({
        where: { id: { in: ids } },
      });
    } catch (err) {
      this.logger.error(`Error al buscar productos: ${err}`);
      throw new InternalServerErrorException("Error en prisma, ", err);
    }
  }
}
