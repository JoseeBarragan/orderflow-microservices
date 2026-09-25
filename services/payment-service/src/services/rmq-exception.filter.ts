import { Catch, RpcExceptionFilter, Logger } from "@nestjs/common";
import { Observable, throwError } from "rxjs";
import { RpcException } from "@nestjs/microservices";

@Catch()
export class RmqExceptionFilter implements RpcExceptionFilter<RpcException> {
  private readonly logger = new Logger(RmqExceptionFilter.name);

  catch(exception: unknown): Observable<any> {
    const message =
      exception instanceof Error ? exception.message : String(exception);

    this.logger.error(
      `Error procesando evento: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );
    const error =
      exception instanceof RpcException ? exception.getError() : exception;

    return throwError(() => error);
  }
}
