export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  createdAt: string;
}

export interface CreateCustomerInput {
  name: string;
  phone: string;
  email?: string;
}
