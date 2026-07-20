import { Injectable } from "@nestjs/common";
import { PgService } from "./Pg.service";
import { Product } from "./products.types";

@Injectable()
export class ProductsRepository {
  constructor(private readonly pg: PgService) {}

  async findAll(limit = 50, offset = 0): Promise<Product[]> {
    const { rows } = await this.pg.query<Product>(
      "SELECT id, name, available_stock, reserved_stock, created_at, updated_at FROM products ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [limit, offset],
    );
    return rows;
  }
}
