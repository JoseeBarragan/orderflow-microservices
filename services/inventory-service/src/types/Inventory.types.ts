export interface Product {
  id: string;
  name: string;
  unitPriceCents: number;
  availableStock: number;
}

export interface GetAllReturnType {
  items: Product[];
}

export interface ListProductsQuery {
  limit?: number;
  offset?: number;
}

export interface NewOrder {
  orderId: string;
  totalAmount: number;
  items: { productId: string; quantity: number; unitPrice: number }[];
}

export type OutboxEventType = "stock.reserve" | "stock.reject";

export interface StockReservedPayload {
  orderId: string;
  items: { productId: string; quantity: number; unitPrice: number }[];
  totalAmount: number;
}

export interface StockRejectedPayload {
  orderId: string;
  reason: string;
}

export type OutboxPayload = StockReservedPayload | StockRejectedPayload;
