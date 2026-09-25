import { Logger } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { status } from "@grpc/grpc-js";
import { Observable, firstValueFrom } from "rxjs";
import { RmqExceptionFilter } from "./rmq-exception.filter";

const subscribeError = (obs: Observable<any>): Promise<unknown> =>
  firstValueFrom(obs);

describe("RmqExceptionFilter", () => {
  let filter: RmqExceptionFilter;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    filter = new RmqExceptionFilter();
    errorSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("propaga el error de un RpcException sin perder su payload", async () => {
    const rpc = new RpcException({
      code: status.INTERNAL,
      message: "db down",
    });

    await expect(subscribeError(filter.catch(rpc))).rejects.toEqual({
      code: status.INTERNAL,
      message: "db down",
    });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("no revienta con un error que no es RpcException y lo propaga intacto", async () => {
    const prismaError = Object.assign(new Error("constraint failed"), {
      code: "P2002",
    });

    await expect(subscribeError(filter.catch(prismaError))).rejects.toBe(
      prismaError,
    );
    expect(errorSpy).toHaveBeenCalled();
  });

  it("tolera un throw que no es ni siquiera Error", async () => {
    const thrown = "boom";

    await expect(subscribeError(filter.catch(thrown))).rejects.toBe(thrown);
  });
});
