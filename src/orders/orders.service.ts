import {
  Injectable,
  OnModuleInit,
  Logger,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { NATS_SERVICE } from '../config/services';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, PrismaClient } from '@prisma/client';
import { RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto } from './dto/change-orderostatus.dto';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { OrderWithProducts } from './interfaces/order-with-products.interfaces';
import { PaidOrderDto } from './dto/paid-order.dto';

interface Product {
  id: number;
  name: string;
  price: number;
}

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('OrdersService');

  constructor(
    @Inject(NATS_SERVICE)
    private readonly client: ClientProxy,
  ) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('OrdersService connected to the database');
  }

  async create(createOrderDto: CreateOrderDto) {
    try {
      const productIds = createOrderDto.items.map((item) => item.productId);

      const products: Product[] = await firstValueFrom<Product[]>(
        this.client.send({ cmd: 'validate_products' }, productIds),
      );

      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
        const price: number =
          products.find((product) => product.id === orderItem.productId)
            ?.price || 0;

        return price * orderItem.quantity;
      }, 0);

      const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
        return acc + orderItem.quantity;
      }, 0);
      // transaction

      const order = await this.order.create({
        data: {
          totalAmount,
          totalItems,
          OrderItems: {
            createMany: {
              data: createOrderDto.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: Number(
                  products.find((product) => product.id === item.productId)
                    ?.price || 0,
                ),
              })),
            },
          },
        },

        include: {
          OrderItems: {
            select: {
              price: true,
              quantity: true,
              productId: true,
            },
          },
        },
      });

      return {
        ...order,
        OrderItems: order.OrderItems.map((orderItem) => ({
          ...orderItem,
          name:
            products.find((product) => product.id === orderItem.productId)
              ?.name || '',
        })),
      };
    } catch (error) {
      throw new RpcException(error as object);
    }

    //  return this.order.create({ data: createOrderDto });
  }

  async findAll(paginationDto: OrderPaginationDto) {
    const totalPages = await this.order.count({
      where: {
        status: paginationDto.status,
      },
    });

    const currentPage = paginationDto.page || 1;
    const perPage = paginationDto.limit || 10;

    return {
      data: await this.order.findMany({
        skip: (currentPage - 1) * perPage,
        take: perPage,
        where: {
          status: paginationDto.status,
        },
      }),
      meta: {
        total: totalPages,
        page: currentPage,
        lastPage: Math.ceil(totalPages / perPage),
      },
    };
  }

  async findOne(id: string) {
    const order = await this.order.findFirst({
      where: { id },
      include: {
        OrderItems: {
          select: {
            price: true,
            quantity: true,
            productId: true,
          },
        },
      },
    });
    if (!order) {
      throw new RpcException({
        message: `Order with id ${id} not found`,
        status: HttpStatus.NOT_FOUND,
      });
    }

    const products: Product[] = await firstValueFrom<Product[]>(
      this.client.send(
        { cmd: 'validate_products' },
        order.OrderItems.map((orderItem) => orderItem.productId),
      ),
    );

    return {
      ...order,
      OrderItems: order.OrderItems.map((orderItem) => ({
        ...orderItem,
        name:
          products.find((product) => product.id === orderItem.productId)
            ?.name || '',
      })),
    };
  }

  async changeOrderStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
    const { id, status } = changeOrderStatusDto;

    const order = await this.findOne(id);

    if (order.status === status) {
      return order;
    }

    return this.order.update({
      where: { id },
      data: { status },
    });
  }

  async createPaymentSession(order: OrderWithProducts) {
    const paymentSession = await firstValueFrom(
      this.client.send('create.payment.session', {
        orderId: order.id,
        currency: 'usd',
        items: order.OrderItems.map((orderItem) => ({
          name: orderItem.name,
          price: orderItem.price,
          quantity: orderItem.quantity,
        })),
      }),
    );
    return paymentSession;
  }

  async paidOrder(paidOrderDto: PaidOrderDto) {
    const order = await this.order.update({
      where: { id: paidOrderDto.orderId },
      data: {
        status: OrderStatus.PAID,
        paid: true,
        paidAt: new Date(),
        stripeChargeId: paidOrderDto.stripePaymentId,
        OrderReceipt: {
          create: {
            receiptUrl: paidOrderDto.receiptUrl,
          },
        },
      },
    });

    return order;
  }
}
