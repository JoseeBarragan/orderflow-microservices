import { Controller } from "@nestjs/common";
import { MessagePattern } from "@nestjs/microservices";
import { AppService } from "./app.service";
import type { ListProductsQuery } from "./products.types";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @MessagePattern("inventory.get")
  getProducts(payload: ListProductsQuery) {
    return this.appService.getProducts(payload?.limit, payload?.offset);
  }
}
