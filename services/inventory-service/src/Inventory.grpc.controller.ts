import { Controller, UseFilters } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { GetAllProductsService } from "./services/GetAllProducts.service";
import type {
  GetAllReturnType,
  ListProductsQuery,
} from "./types/Inventory.types";
import { GrpcExceptionFilter } from "./services/error/rcp-exception.filter";

@UseFilters(new GrpcExceptionFilter())
@Controller()
export class InventoryGrpcController {
  constructor(private readonly getAllProductsService: GetAllProductsService) {}

  @GrpcMethod("InventoryService")
  async getAll(payload: ListProductsQuery): Promise<GetAllReturnType> {
    return await this.getAllProductsService.getProducts(
      payload?.limit,
      payload?.offset,
    );
  }
}
