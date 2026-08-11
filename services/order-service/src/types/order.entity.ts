export type OrderItems = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

export type OrderItemsWithOutId = {
  quantity: number;
  unitPrice: number;
};

export type OrderStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

export type OutboxEventType = "worder.createdw";

export interface NewOrder {
  orderId: string;
  totalAmount: number;
  items: { productId: string; quantity: number; unitPrice: number }[];
}
