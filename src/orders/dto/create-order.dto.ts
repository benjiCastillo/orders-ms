import { OrderStatus } from '@prisma/client';
import {
  IsNumber,
  IsPositive,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { OrderStatusList } from '../enum/order.enum';

export class CreateOrderDto {
  @IsNumber()
  @IsPositive()
  totalAmount: number;

  @IsNumber()
  @IsPositive()
  totalItems: number;

  @IsEnum(OrderStatusList, {
    message: `Invalid order status, the value must be ${OrderStatusList.join(
      ', ',
    )}`,
  })
  @IsOptional()
  status: OrderStatus = OrderStatus.PENDING;

  @IsOptional()
  @IsBoolean()
  paid: boolean = false;
}
