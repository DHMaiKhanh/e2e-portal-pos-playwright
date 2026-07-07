import { BaseApiClient } from '@api/clients/BaseApiClient';
import type { Paginated } from '@api/models/Common';
import type { Order, CreateOrderInput } from '@api/models/Order';

/** Orders API service. */
export class OrderService {
  constructor(private readonly client: BaseApiClient) {}

  async list(params?: { page?: number; status?: string }): Promise<Paginated<Order>> {
    const res = await this.client.get('/orders', { params });
    return (await res.json()) as Paginated<Order>;
  }

  async getById(id: string): Promise<Order> {
    const res = await this.client.get(`/orders/${id}`, { failOnStatusCode: true });
    return (await res.json()) as Order;
  }

  async create(input: CreateOrderInput): Promise<Order> {
    const res = await this.client.post('/orders', { data: input, failOnStatusCode: true });
    return (await res.json()) as Order;
  }

  async cancel(id: string): Promise<void> {
    await this.client.post(`/orders/${id}/cancel`, { failOnStatusCode: true });
  }
}
