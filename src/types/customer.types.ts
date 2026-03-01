export type CustomerType = "hogar" | "comercio" | "empresa";

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  taxId: string;
  phones: string[];
  emails: string[];
  address: string;
  primaryContact: string;
  type: CustomerType;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerInput {
  name: string;
  taxId: string;
  phones: string[];
  emails: string[];
  address: string;
  primaryContact: string;
  type: CustomerType;
}

export interface CustomersQuery {
  page: number;
  pageSize: number;
  search?: string;
  type?: CustomerType;
}

export interface CustomersResult {
  items: Customer[];
  total: number;
}

export interface CustomerFormValues {
  name: string;
  taxId: string;
  phones: string;
  emails: string;
  address: string;
  primaryContact: string;
  type: CustomerType;
}
