import { BaseApiClient } from '@api/clients/BaseApiClient';
import type { Paginated } from '@api/models/Common';
import type { Product, CreateProductInput } from '@api/models/Product';

/** Products API service. */
export class ProductService {
  constructor(private readonly client: BaseApiClient) {}

  async list(params?: { page?: number; search?: string }): Promise<Paginated<Product>> {
    const res = await this.client.get('/products', { params });
    return (await res.json()) as Paginated<Product>;
  }

  async create(input: CreateProductInput): Promise<Product> {
    const res = await this.client.post('/products', { data: input, failOnStatusCode: true });
    return (await res.json()) as Product;
  }

  async delete(id: string): Promise<void> {
    await this.client.delete(`/products/${id}`, { failOnStatusCode: true });
  }
}
