import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../libs/supabase";
import type { Company, CompanyInput, CompanyProfile } from "../types/Company";
import type { RoleProfile } from "../types/Role";
import type { UserRoleRow } from "../types/types";
import { logAuditEvent } from "./audit.service";

type CompanyRow = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  rnc: string | null;
  logo_url: string | null;
  created_at: string | null;
};

function buildErrorMessage(error: PostgrestError | null, fallback: string): string {
  if (!error) return fallback;
  return error.message || fallback;
}

function mapCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    rnc: row.rnc,
    logoUrl: row.logo_url,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

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

export async function listCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, address, phone, rnc, logo_url, created_at")
    .order("created_at", { ascending: false })
    .returns<CompanyRow[]>();

  if (error) {
    throw new Error(buildErrorMessage(error, "No se pudieron cargar las companias."));
  }

  return (data ?? []).map(mapCompany);
}

export async function createCompany(input: CompanyInput): Promise<Company> {
  const { data, error } = await supabase
    .from("companies")
    .insert({
      name: input.name,
      address: input.address,
      phone: input.phone,
      rnc: input.rnc,
      logo_url: input.logoUrl ?? null,
    })
    .select("id, name, address, phone, rnc, logo_url, created_at")
    .single<CompanyRow>();

  if (error || !data) {
    throw new Error(buildErrorMessage(error, "No se pudo crear la compania."));
  }

  const created = mapCompany(data);

  await logAuditEvent({
    action: "create",
    entity: "companies",
    entityId: created.id,
    companyId: created.id,
    newValues: {
      name: created.name,
      address: created.address,
      phone: created.phone,
      rnc: created.rnc,
      logoUrl: created.logoUrl,
    },
  });

  return created;
}

export async function updateCompany(companyId: string, input: CompanyInput): Promise<Company> {
  const payload: Record<string, string | null> = {
    name: input.name,
    address: input.address,
    phone: input.phone,
    rnc: input.rnc,
  };

  if (input.logoUrl !== undefined) {
    payload.logo_url = input.logoUrl;
  }

  const { data, error } = await supabase
    .from("companies")
    .update(payload)
    .eq("id", companyId)
    .select("id, name, address, phone, rnc, logo_url, created_at")
    .maybeSingle<CompanyRow>();

  if (error) {
    throw new Error(buildErrorMessage(error, "No se pudo actualizar la compania."));
  }

  if (!data) {
    throw new Error("No se pudo actualizar la compania. Verifica permisos y politicas RLS.");
  }

  const updated = mapCompany(data);

  await logAuditEvent({
    action: "update",
    entity: "companies",
    entityId: updated.id,
    companyId: updated.id,
    newValues: {
      name: updated.name,
      address: updated.address,
      phone: updated.phone,
      rnc: updated.rnc,
      logoUrl: updated.logoUrl,
    },
  });

  return updated;
}

export async function deleteCompany(companyId: string): Promise<void> {
  const { data: existing } = await supabase
    .from("companies")
    .select("id, name, address, phone, rnc, logo_url")
    .eq("id", companyId)
    .maybeSingle<CompanyRow>();

  const { error } = await supabase.from("companies").delete().eq("id", companyId);

  if (error) {
    throw new Error(buildErrorMessage(error, "No se pudo eliminar la compania."));
  }

  await logAuditEvent({
    action: "delete",
    entity: "companies",
    entityId: companyId,
    companyId,
    oldValues: existing
      ? {
          name: existing.name,
          address: existing.address,
          phone: existing.phone,
          rnc: existing.rnc,
          logoUrl: existing.logo_url,
        }
      : null,
  });
}

export async function uploadCompanyLogo(params: { companyId: string; file: File }): Promise<string> {
  const ext = params.file.name.split(".").pop() || "jpg";
  const objectPath = `${params.companyId}/logo.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("companies_logos")
    .upload(objectPath, params.file, {
      upsert: true,
      contentType: params.file.type || "image/jpeg",
      cacheControl: "3600",
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("companies_logos").getPublicUrl(objectPath);
  return data.publicUrl;
}

export async function deleteCompanyLogo(companyId: string): Promise<void> {
  const { data: files, error: listError } = await supabase.storage
    .from("companies_logos")
    .list(companyId);

  if (listError) throw listError;
  if (!files || files.length === 0) return;

  const paths = files.map((file) => `${companyId}/${file.name}`);
  const { error } = await supabase.storage.from("companies_logos").remove(paths);
  if (error) throw error;
}
