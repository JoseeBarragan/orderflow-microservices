import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsPositive, IsString, IsUUID, ValidateNested } from 'class-validator';

export class OrderItemDto {
  @IsString()
  @IsUUID()
  productId: string;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsPositive()
  unitPrice: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
