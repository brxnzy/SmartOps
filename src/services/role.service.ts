import { supabase } from "../libs/supabase";
import type {Role, CreateRolePayload, UpdateRolePayload } from "../types/Role";
import type { RoleRow } from "../types/types";


export async function getRolesByCompany(companyId: string | null): Promise<Role[]> {
  const baseQuery = supabase
    .from("roles")
    .select("id, name, company_id")
    .order("name", { ascending: true });

  const query = companyId
    ? baseQuery.or(`company_id.eq.${companyId},and(name.eq.admin,company_id.is.null)`)
    : baseQuery.eq("name", "admin").is("company_id", null);

  const { data, error } = await query.returns<RoleRow[]>();

  if (error) throw error;

  return (data ?? []).map((role) => ({
    id: role.id,
    name: role.name,
    companyId: role.company_id,
  }));
}

export async function createRole(payload: CreateRolePayload): Promise<Role> {
  const { data, error } = await supabase
    .from("roles")
    .insert({
      name: payload.name,
      company_id: payload.companyId,
    })
    .select("id, name, company_id")
    .single<RoleRow>();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    companyId: data.company_id,
  };
}

export async function updateRole(payload: UpdateRolePayload): Promise<Role> {
  const { data, error } = await supabase
    .from("roles")
    .update({ name: payload.name })
    .eq("id", payload.id)
    .select("id, name, company_id")
    .single<RoleRow>();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    companyId: data.company_id,
  };
}

export async function deleteRole(roleId: string): Promise<void> {
  const { error } = await supabase.from("roles").delete().eq("id", roleId);
  if (error) throw error;
}
