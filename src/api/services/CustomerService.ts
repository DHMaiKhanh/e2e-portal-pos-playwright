import { BaseApiClient } from '@api/clients/BaseApiClient';
import type { Paginated } from '@api/models/Common';
import type { Customer, CreateCustomerInput } from '@api/models/Customer';

/** Customers API service. */
export class CustomerService {
  constructor(private readonly client: BaseApiClient) {}

  async list(params?: { page?: number; search?: string }): Promise<Paginated<Customer>> {
    const res = await this.client.get('/customers', { params });
    return (await res.json()) as Paginated<Customer>;
  }

  async create(input: CreateCustomerInput): Promise<Customer> {
    const res = await this.client.post('/customers', { data: input, failOnStatusCode: true });
    return (await res.json()) as Customer;
  }
}
