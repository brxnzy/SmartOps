import { supabase } from "../libs/supabase";
import type { CompanyProfile } from "../types/Company";
import type { RoleProfile } from "../types/Role";
import type { UserRoleRow } from "../types/types";


export async function getUserCompanyAndRole(userId: string): Promise<{
  companyProfile: CompanyProfile | null;
  roleProfile: RoleProfile | null;
}> {
  const { data, error } = await supabase
    .from("user_roles")
    .select(`
      company_id,
      companies:company_id ( id, name, address, phone, rnc, logo_url ),
      roles:role_id ( id, name )
    `)
    .eq("user_id", userId)
    .limit(1)
    .returns<UserRoleRow[]>();

  if (error) throw error;

  const selected = data?.[0] ?? null;

  const companyProfile = selected?.companies
    ? {
        id: selected.companies.id,
        name: selected.companies.name,
        address: selected.companies.address,
        phone: selected.companies.phone,
        rnc: selected.companies.rnc,
        logoUrl: selected.companies.logo_url,
      }
    : null;

  const roleProfile = selected?.roles
    ? {
        id: selected.roles.id,
        name: selected.roles.name,
      }
    : null;

  return { companyProfile, roleProfile };
}
