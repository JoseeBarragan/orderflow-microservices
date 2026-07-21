type OrderItems = { productId: string; quantity: number; unitaryPrice: number };

export enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED",
}

export class Order {
  constructor(
    private readonly _orderId: string,
    private _orderStatus: OrderStatus,
    private readonly _items: OrderItems[],
    private readonly _totalAmount: number,
  ) {}

  static create(id: string, items: OrderItems[]) {
    if (items.length === 0) {
      throw new Error("Una orden necesita al menos un item");
    }

    const total = items.reduce(
      (accum, item) => accum + item.unitaryPrice * item.quantity,
      0,
    );

    return new Order(id, OrderStatus.PENDING, items, total);
  }

  get id() {
    return this._orderId;
  }

  get status() {
    return this._orderStatus;
  }

  get items() {
    return this._items;
  }

  get total() {
    return this._totalAmount;
  }
}
