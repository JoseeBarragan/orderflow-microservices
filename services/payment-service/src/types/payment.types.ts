export interface StockReservedPayload {
  orderId: string;
  items: { productId: string; quantity: number; unitPrice: number }[];
  totalAmount: number;
}
