import { Injectable } from "@nestjs/common";
import { InventoryRepository } from "../Repository/Inventory.repository";
import { Product } from "../types/Inventory.types";

@Injectable()
export class GetAllProductsService {
  constructor(private readonly productsRepository: InventoryRepository) {}

  async getProducts(limit = 50, offset = 0): Promise<Product[]> {
    return await this.productsRepository.findAll(limit, offset);
  }
}
