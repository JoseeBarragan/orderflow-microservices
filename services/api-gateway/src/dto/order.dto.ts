import { IsInt, IsNotEmpty, IsPositive, IsString, IsUUID } from "class-validator";

export class CreateOrderDto {
  
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsPositive()
  unitPrice: number;
}
