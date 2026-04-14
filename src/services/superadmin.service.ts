import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../libs/supabase";
import type {
  SuperadminCompanySummary,
  SuperadminOverview,
  SuperadminUserSummary,
} from "../types/superadmin";

type CompanyRow = {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string | null;
};

type CompanyMembershipRow = {
  company_id: string | null;
  user_id: string | null;
  users: {
    id: string;
    name: string;
    email: string | null;
    photo_url: string | null;
  } | null;
};

function buildErrorMessage(error: PostgrestError | null, fallback: string): string {
  if (!error) return fallback;
  return error.message || fallback;
}

function mapCompany(row: CompanyRow): SuperadminCompanySummary {
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url,
    createdAt: row.created_at,
    users: [],
    totalUsers: 0,
  };
}

function sortUsers(users: SuperadminUserSummary[]) {
  return [...users].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
}

function attachUsers(
  companies: CompanyRow[],
  memberships: CompanyMembershipRow[]
): SuperadminCompanySummary[] {
  const companyMap = new Map(companies.map((company) => [company.id, mapCompany(company)]));

  memberships.forEach((membership) => {
    if (!membership.company_id || !membership.user_id || !membership.users) return;

    const company = companyMap.get(membership.company_id);
    if (!company) return;

    const alreadyExists = company.users.some((user) => user.id === membership.user_id);
    if (alreadyExists) return;

    company.users.push({
      id: membership.users.id,
      name: membership.users.name,
      email: membership.users.email,
      photoUrl: membership.users.photo_url,
    });
  });

  return Array.from(companyMap.values()).map((company) => {
    const users = sortUsers(company.users);

    return {
      ...company,
      users,
      totalUsers: users.length,
    };
  });
}

export async function getSuperadminOverview(): Promise<SuperadminOverview> {
  const [companiesResponse, membershipsResponse] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, logo_url, created_at")
      .order("created_at", { ascending: false })
      .returns<CompanyRow[]>(),
    supabase
      .from("user_roles")
      .select("company_id, user_id, users:user_id ( id, name, email, photo_url )")
      .not("company_id", "is", null)
      .returns<CompanyMembershipRow[]>(),
  ]);

  if (companiesResponse.error) {
    throw new Error(
      buildErrorMessage(companiesResponse.error, "No se pudo cargar el resumen de companias.")
    );
  }

  if (membershipsResponse.error) {
    throw new Error(
      buildErrorMessage(membershipsResponse.error, "No se pudieron cargar los usuarios de companias.")
    );
  }

  const companies = attachUsers(companiesResponse.data ?? [], membershipsResponse.data ?? []);
  const totalUsers = new Set(
    companies.flatMap((company) => company.users.map((user) => user.id))
  ).size;

  return {
    companiesCount: companies.length,
    totalUsers,
    companies,
  };
}

export async function getSuperadminCompanyDetail(
  companyId: string
): Promise<SuperadminCompanySummary> {
  const [companyResponse, membershipsResponse] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, logo_url, created_at")
      .eq("id", companyId)
      .maybeSingle<CompanyRow>(),
    supabase
      .from("user_roles")
      .select("company_id, user_id, users:user_id ( id, name, email, photo_url )")
      .eq("company_id", companyId)
      .returns<CompanyMembershipRow[]>(),
  ]);

  if (companyResponse.error) {
    throw new Error(
      buildErrorMessage(companyResponse.error, "No se pudo cargar la compania seleccionada.")
    );
  }

  if (!companyResponse.data) {
    throw new Error("La compania solicitada no existe o no esta disponible.");
  }

  if (membershipsResponse.error) {
    throw new Error(
      buildErrorMessage(membershipsResponse.error, "No se pudieron cargar los usuarios de la compania.")
    );
  }

  const [company] = attachUsers([companyResponse.data], membershipsResponse.data ?? []);
  return company;
}
