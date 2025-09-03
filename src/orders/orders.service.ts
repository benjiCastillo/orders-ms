import {
  Injectable,
  OnModuleInit,
  Logger,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { PRODUCTS_SERVICE } from '../../config/services';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient } from '@prisma/client';
import { Order } from '@prisma/client';
import { RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto } from './dto/change-orderostatus.dto';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

interface Product {
  id: number;
  name: string;
  price: number;
}

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('OrdersService');

  constructor(
    @Inject(PRODUCTS_SERVICE)
    private readonly productsService: ClientProxy,
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
        this.productsService.send({ cmd: 'validate_products' }, productIds),
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

  async findOne(id: string): Promise<Order> {
    const order = await this.order.findFirst({ where: { id } });
    if (!order) {
      throw new RpcException({
        message: `Order with id ${id} not found`,
        status: HttpStatus.NOT_FOUND,
      });
    }
    return order;
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
}
