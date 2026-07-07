export interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  active: boolean;
  category?: string;
}

export interface CreateProductInput {
  sku: string;
  name: string;
  price: number;
  category?: string;
}
