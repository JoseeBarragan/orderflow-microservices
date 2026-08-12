export class PaymentNotFoundError extends Error {
  constructor(orderId: string) {
    super(`Payment para la orden ${orderId} no encontrado`);
  }
}
