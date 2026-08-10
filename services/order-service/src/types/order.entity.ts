export type OrderItems = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

export type OrderItemsWithOutId = {
  quantity: number;
  unitPrice: number;
};

export enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED",
}

export type OutboxEventType = "order.created";

export interface NewOrder {
  orderId: string;
  totalAmount: number;
  items: { productId: string; quantity: number; unitPrice: number }[];
}
