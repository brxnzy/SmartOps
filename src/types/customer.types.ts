export type CustomerType = "hogar" | "comercio" | "empresa";

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  idCard: string | null;
  phone: string | null;
  taxId: string;
  type: CustomerType;
  createdAt: string;
}

export interface CustomerInput {
  name: string;
  idCard: string | null;
  phone: string | null;
  taxId: string;
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
  idCard: string;
  phone: string;
  taxId: string;
  type: CustomerType;
}
