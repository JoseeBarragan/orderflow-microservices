import {
  Catch,
  RpcExceptionFilter,
  ArgumentsHost,
  Logger,
} from "@nestjs/common";
import { Observable, throwError } from "rxjs";
import { RpcException } from "@nestjs/microservices";

@Catch()
export class RmqExceptionFilter implements RpcExceptionFilter<RpcException> {
  private readonly logger = new Logger(RmqExceptionFilter.name);

  catch(exception: RpcException, host: ArgumentsHost): Observable<any> {
    this.logger.error(
      `Error procesando evento: ${exception?.message}`,
      exception?.stack,
    );
    return throwError(() => exception.getError());
  }
}
