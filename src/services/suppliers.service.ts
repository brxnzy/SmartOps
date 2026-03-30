import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../libs/supabase";
import type {
  Supplier,
  SupplierInput,
  SuppliersQuery,
  SuppliersResult,
} from "../types/supplier.types";

type SupplierRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  company_id: string;
  created_at: string | null;
};

function buildErrorMessage(error: PostgrestError | null, fallback: string): string {
  if (!error) return fallback;
  return error.message || fallback;
}

function sanitizeSearch(value: string): string {
  return value.replace(/[(),]/g, " ").trim();
}

function mapSupplier(row: SupplierRow): Supplier {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

export async function listSuppliers(
  companyId: string,
  query: SuppliersQuery
): Promise<SuppliersResult> {
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, email, phone, address, company_id, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .returns<SupplierRow[]>();

  if (error) {
    throw new Error(buildErrorMessage(error, "No se pudo cargar la lista de proveedores."));
  }

  let mapped = (data ?? []).map(mapSupplier);

  const safeSearch = query.search ? sanitizeSearch(query.search).toLowerCase() : "";
  if (safeSearch) {
    mapped = mapped.filter((item) => {
      const searchable = [
        item.name,
        item.email ?? "",
        item.phone ?? "",
        item.address ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(safeSearch);
    });
  }

  const from = (query.page - 1) * query.pageSize;
  const paginated = mapped.slice(from, from + query.pageSize);

  return {
    items: paginated,
    total: mapped.length,
  };
}

export async function getSuppliersByCompany(companyId: string | null): Promise<Supplier[]> {
  if (!companyId) return [];

  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, email, phone, address, company_id, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .returns<SupplierRow[]>();

  if (error) {
    throw new Error(buildErrorMessage(error, "No se pudo cargar la lista de proveedores."));
  }

  return (data ?? []).map(mapSupplier);
}

export async function createSupplier(companyId: string, input: SupplierInput): Promise<Supplier> {
  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      name: input.name,
      email: input.email,
      phone: input.phone,
      address: input.address,
      company_id: companyId,
    })
    .select("id, name, email, phone, address, company_id, created_at")
    .single<SupplierRow>();

  if (error || !data) {
    throw new Error(buildErrorMessage(error, "No se pudo crear el proveedor."));
  }

  return mapSupplier(data);
}

export async function updateSupplier(
  companyId: string,
  supplierId: string,
  input: SupplierInput
): Promise<Supplier> {
  const { data, error } = await supabase
    .from("suppliers")
    .update({
      name: input.name,
      email: input.email,
      phone: input.phone,
      address: input.address,
    })
    .eq("id", supplierId)
    .eq("company_id", companyId)
    .select("id, name, email, phone, address, company_id, created_at")
    .single<SupplierRow>();

  if (error || !data) {
    throw new Error(buildErrorMessage(error, "No se pudo actualizar el proveedor."));
  }

  return mapSupplier(data);
}

export async function deleteSupplier(companyId: string, supplierId: string): Promise<void> {
  const { error } = await supabase
    .from("suppliers")
    .delete()
    .eq("id", supplierId)
    .eq("company_id", companyId);

  if (error) {
    throw new Error(buildErrorMessage(error, "No se pudo eliminar el proveedor."));
  }
}
