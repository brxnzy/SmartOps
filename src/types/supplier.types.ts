export interface Supplier {
  id: string;
  companyId: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
}

export interface SupplierInput {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export interface SuppliersQuery {
  page: number;
  pageSize: number;
  search?: string;
}

export interface SuppliersResult {
  items: Supplier[];
  total: number;
}

export interface SupplierFormValues {
  name: string;
  email: string;
  phone: string;
  address: string;
}
