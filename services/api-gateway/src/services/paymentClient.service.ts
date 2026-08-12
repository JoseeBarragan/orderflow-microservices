import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { Observable } from "rxjs";

interface PaymentClientService {
  confirmPayment(data: {orderId: string}): Observable<{ status: string }>
}

@Injectable()
export class PaymentGatewayService implements OnModuleInit {
  private paymentClientService: PaymentClientService;

  constructor(@Inject("PAYMENT_PACKAGE") private readonly client: ClientGrpc){}

  onModuleInit() {
      this.paymentClientService = this.client.getService<PaymentClientService>("PaymentService")
  }

  confirmPayment(orderId: string) {
    return this.paymentClientService.confirmPayment({ orderId });
  }
}
