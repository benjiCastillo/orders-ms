import { Catch, ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Response } from 'express';
import { Logger } from '@nestjs/common';

interface RpcExceptionInterface {
  status: number;
  message: string;
}

@Catch(RpcException)
export class RpcCustomExceptionFilter implements ExceptionFilter {
  catch(exception: RpcException, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();

    const rpcError = exception.getError() as RpcExceptionInterface;
    const logger = new Logger('Main-Gateway');
    logger.log(rpcError);
    if (
      typeof rpcError === 'object' &&
      'status' in rpcError &&
      'message' in rpcError
    ) {
      const status: number = isNaN(+rpcError.status)
        ? 400
        : Number(rpcError.status);
      return response.status(status).json(rpcError);
    }
    response.status(400).json(rpcError);
  }
}
