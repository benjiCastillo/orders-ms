import { IsEnum, IsUUID } from 'class-validator';
import { OrderStatusList } from '../enum/order.enum';
import { OrderStatus } from '@prisma/client';

export class ChangeOrderStatusDto {
  @IsUUID()
  id: string;

  @IsEnum(OrderStatusList, {
    message:
      'Invalid order status, valid values are: ' + OrderStatusList.join(', '),
  })
  status: OrderStatus;
}
