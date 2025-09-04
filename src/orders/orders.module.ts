import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { NatsModule } from '../transports/nats.module';

@Module({
  controllers: [OrdersController],
  imports: [NatsModule],
  providers: [OrdersService],
})
export class OrdersModule {}
