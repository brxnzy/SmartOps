import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../libs/supabase";

let cachedCustomerRoleId: string | null = null;

function buildErrorMessage(error: PostgrestError | null, fallback: string): string {
  return error?.message || fallback;
}

async function getCustomerRoleId(): Promise<string> {
  if (cachedCustomerRoleId) return cachedCustomerRoleId;

  const { data, error } = await supabase
    .from("roles")
    .select("id")
    .eq("name", "customer")
    .maybeSingle<{ id: string }>();

  if (error || !data?.id) {
    throw new Error(buildErrorMessage(error, "No se encontro el rol customer."));
  }

  cachedCustomerRoleId = data.id;
  return data.id;
}

export async function getCompanyTechniciansCount(companyId: string): Promise<number> {
  const customerRoleId = await getCustomerRoleId();

  const { count, error } = await supabase
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .neq("role_id", customerRoleId);

  if (error) {
    throw new Error(buildErrorMessage(error, "No se pudo cargar el conteo de usuarios."));
  }

  return count ?? 0;
}

export async function getCompanySitesCount(companyId: string): Promise<number> {
  const { count, error } = await supabase
    .from("customer_sites")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  if (error) {
    throw new Error(buildErrorMessage(error, "No se pudo cargar el conteo de sitios."));
  }

  return count ?? 0;
}

export async function getCompanyClientsCount(companyId: string): Promise<number> {
  const customerRoleId = await getCustomerRoleId();

  const { count, error } = await supabase
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("role_id", customerRoleId);

  if (error) {
    throw new Error(buildErrorMessage(error, "No se pudo cargar el conteo de clientes."));
  }

  return count ?? 0;
}
