import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../libs/supabase";
import type {
  Customer,
  CustomerInput,
  CustomersQuery,
  CustomersResult,
} from "../types/customer.types";

type CustomerRow = {
  id: string;
  company_id: string;
  name: string;
  id_card: string | null;
  phone: string | null;
  tax_id: string;
  type: Customer["type"];
  created_at: string;
};

const BASE_SELECT = "id, company_id, name, id_card, phone, tax_id, type, created_at";

function toDomain(row: CustomerRow): Customer {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    idCard: row.id_card,
    phone: row.phone,
    taxId: row.tax_id,
    type: row.type,
    createdAt: row.created_at,
  };
}

function toDatabasePayload(input: CustomerInput, companyId: string) {
  return {
    company_id: companyId,
    name: input.name,
    id_card: input.idCard,
    phone: input.phone,
    tax_id: input.taxId,
    type: input.type,
  };
}

function buildErrorMessage(error: PostgrestError | null, fallback: string): string {
  if (!error) return fallback;

  if (error.code === "23505") {
    return "Ya existe un cliente con ese documento fiscal en esta compania.";
  }

  return error.message || fallback;
}

function sanitizeSearch(value: string): string {
  return value.replace(/[(),]/g, " ").trim();
}

export async function listCustomers(
  companyId: string,
  query: CustomersQuery
): Promise<CustomersResult> {
  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;

  let request = supabase
    .from("customers")
    .select(BASE_SELECT, { count: "exact" })
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .range(from, to);

  const safeSearch = query.search ? sanitizeSearch(query.search) : "";
  if (safeSearch) {
    request = request.or(
      `name.ilike.%${safeSearch}%,tax_id.ilike.%${safeSearch}%,id_card.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%`
    );
  }

  if (query.type) {
    request = request.eq("type", query.type);
  }

  const { data, error, count } = await request.returns<CustomerRow[]>();

  if (error) {
    throw new Error(buildErrorMessage(error, "No se pudo cargar la lista de clientes."));
  }

  return {
    items: (data ?? []).map(toDomain),
    total: count ?? 0,
  };
}

export async function createCustomer(companyId: string, input: CustomerInput): Promise<Customer> {
  const payload = toDatabasePayload(input, companyId);

  const { data, error } = await supabase
    .from("customers")
    .insert(payload)
    .select(BASE_SELECT)
    .single<CustomerRow>();

  if (error) {
    throw new Error(buildErrorMessage(error, "No se pudo crear el cliente."));
  }

  return toDomain(data);
}

export async function updateCustomer(
  companyId: string,
  customerId: string,
  input: CustomerInput
): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .update(toDatabasePayload(input, companyId))
    .eq("company_id", companyId)
    .eq("id", customerId)
    .select(BASE_SELECT)
    .single<CustomerRow>();

  if (error) {
    throw new Error(buildErrorMessage(error, "No se pudo actualizar el cliente."));
  }

  return toDomain(data);
}

export async function deleteCustomer(companyId: string, customerId: string): Promise<void> {
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("company_id", companyId)
    .eq("id", customerId);

  if (error) {
    throw new Error(buildErrorMessage(error, "No se pudo eliminar el cliente."));
  }
}
