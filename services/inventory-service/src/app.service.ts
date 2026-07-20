import { Injectable } from "@nestjs/common";
import { ProductsRepository } from "./products.repository";
import { Product } from "./products.types";

@Injectable()
export class AppService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async getProducts(limit = 50, offset = 0): Promise<Product[]> {
    return await this.productsRepository.findAll(limit, offset);
  }
}
