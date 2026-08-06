import { Injectable } from "@nestjs/common";
import { InventoryRepository } from "src/Inventory.repository";
import { Product } from "src/Inventory.types";

@Injectable()
export class GetAllProductsService {
  constructor(private readonly productsRepository: InventoryRepository) {}

  async getProducts(limit = 50, offset = 0): Promise<Product[]> {
    return await this.productsRepository.findAll(limit, offset);
  }
}
