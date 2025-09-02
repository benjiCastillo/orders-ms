import { PaginationDto } from 'src/common/dto/pagination.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { OrderStatusList } from '../enum/order.enum';
import { OrderStatus } from '@prisma/client';

export class OrderPaginationDto extends PaginationDto {
  @IsOptional()
  @IsEnum(OrderStatusList, {
    message:
      'Invalid order status, valid values are: ' + OrderStatusList.join(', '),
  })
  status?: OrderStatus;
}
