export interface Product {
  id: string;
  name: string;
  available_stock: number;
  reserved_stock: number;
  created_at: Date;
  updated_at: Date;
}

export interface ListProductsQuery {
  limit?: number;
  offset?: number;
}
