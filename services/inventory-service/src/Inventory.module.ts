import { Module } from "@nestjs/common";
import { InventoryController } from "./Inventory.controller";
import { InventoryService } from "./Inventory.service";
import { PgService } from "./Pg.service";
import { InventoryRepository } from "./Inventory.repository";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [InventoryController],
  providers: [InventoryService, PgService, InventoryRepository],
})
export class InventoryModule {}
