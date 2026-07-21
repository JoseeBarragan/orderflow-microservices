import { Injectable } from "@nestjs/common";
import { InventoryRepository } from "./Inventory.repository";
import { Product } from "./Inventory.types";

@Injectable()
export class InventoryService {
  constructor(private readonly productsRepository: InventoryRepository) {}

  async getProducts(limit = 50, offset = 0): Promise<Product[]> {
    return await this.productsRepository.findAll(limit, offset);
  }
}
