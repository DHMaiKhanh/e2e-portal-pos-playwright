export type OrderStatus = 'pending' | 'paid' | 'refunded' | 'cancelled';

export interface OrderLineItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerId?: string;
  items: OrderLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
}

export interface CreateOrderInput {
  customerId?: string;
  items: Array<Pick<OrderLineItem, 'productId' | 'quantity'>>;
}
