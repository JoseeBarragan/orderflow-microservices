export class PaymentNotFoundError extends Error {
  constructor(orderId: string) {
    super(`Payment para la orden ${orderId} no encontrado`);
  }
}

export class PaymentAlreadySettledError extends Error {
  constructor(orderId: string, currentStatus: string) {
    super(
      `El pago de la orden ${orderId} ya fue procesado y está en estado ${currentStatus}, no se puede confirmar de nuevo`,
    );
  }
}
