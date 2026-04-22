import { supabase } from "../libs/supabase";
import type { SuperadminCompanySummary, SuperadminOverview } from "../types/superadmin";

function buildErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function mapCompany(raw: unknown): SuperadminCompanySummary {
  const company = (raw ?? {}) as Partial<SuperadminCompanySummary>;
  const users = Array.isArray(company.users) ? company.users : [];

  return {
    id: typeof company.id === "string" ? company.id : "",
    name: typeof company.name === "string" ? company.name : "",
    logoUrl: typeof company.logoUrl === "string" ? company.logoUrl : null,
    createdAt: typeof company.createdAt === "string" ? company.createdAt : null,
    users: users
      .map((user) => {
        const item = (user ?? {}) as unknown as Record<string, unknown>;
        if (typeof item.id !== "string" || typeof item.name !== "string") {
          return null;
        }

        return {
          id: item.id,
          name: item.name,
          idCard: typeof item.idCard === "string" ? item.idCard : null,
          email: typeof item.email === "string" ? item.email : null,
          photoUrl: typeof item.photoUrl === "string" ? item.photoUrl : null,
        };
      })
      .filter((user): user is SuperadminCompanySummary["users"][number] => Boolean(user)),
    totalUsers: typeof company.totalUsers === "number" ? company.totalUsers : users.length,
  };
}

async function getSuperadminRpcResult<T>(
  rpcName: "get_superadmin_overview" | "get_superadmin_company_detail",
  params: Record<string, unknown> | undefined,
  fallback: string
): Promise<T> {
  const { data, error } = await supabase.rpc(rpcName, params);
  if (error) {
    throw new Error(error.message || fallback);
  }

  if (data === null || data === undefined) {
    throw new Error(fallback);
  }

  return data as T;
}

export async function getSuperadminOverview(): Promise<SuperadminOverview> {
  try {
    const result = await getSuperadminRpcResult<Record<string, unknown>>(
      "get_superadmin_overview",
      undefined,
      "No se pudo cargar el resumen de superadmin."
    );
    const companies = Array.isArray(result.companies) ? result.companies.map(mapCompany) : [];

    return {
      companiesCount:
        typeof result.companiesCount === "number" ? result.companiesCount : companies.length,
      totalUsers: typeof result.totalUsers === "number" ? result.totalUsers : 0,
      companies,
    };
  } catch (error) {
    throw new Error(buildErrorMessage(error, "No se pudo cargar el resumen de superadmin."));
  }
}

export async function getSuperadminCompanyDetail(
  companyId: string
): Promise<SuperadminCompanySummary> {
  try {
    const result = await getSuperadminRpcResult<unknown>(
      "get_superadmin_company_detail",
      { p_company_id: companyId },
      "No se pudo cargar la compania seleccionada."
    );
    return mapCompany(result);
  } catch (error) {
    throw new Error(buildErrorMessage(error, "No se pudo cargar la compania seleccionada."));
  }
}
