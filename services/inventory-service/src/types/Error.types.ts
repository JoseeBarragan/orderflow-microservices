export class StockUnavailableError extends Error {
  constructor(productId: string) {
    super(`Stock insuficiente para producto ${productId}`);
  }
}
