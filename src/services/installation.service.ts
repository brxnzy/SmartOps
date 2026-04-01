import { supabase } from "../libs/supabase";
import { logAuditEvent } from "./audit.service";

export interface InstallationProject {
  id: string;
  companyId: string;
  budgetId: string;
  siteId: string;
  responsibleUserId: string | null;
  status: "pendiente" | "en_progreso" | "terminado" | "cancelado";
  createdAt: string | null;
  updatedAt: string | null;
  technicalVisitId: string | null;
  technicalVisitStatus: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  technicianId: string | null;
  technicianName: string | null;
}

export interface InstallationHistoryEntry {
  id: string;
  budgetId: string;
  technicalVisitId: string | null;
  status: string | null;
  createdAt: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  technicianId: string | null;
  technicianName: string | null;
  visitStatus: string | null;
}

function safeText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function safeNullableText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return safeText(value, "");
}

function pickSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function mapProject(row: Record<string, unknown>): InstallationProject {
  const visitsRaw = row.technical_visits as unknown;
  const visit = pickSingle(visitsRaw as Record<string, unknown> | Record<string, unknown>[] | null | undefined);
  const technician = pickSingle(
    (visit as { users?: Record<string, unknown> | Record<string, unknown>[] | null | undefined } | null | undefined)
      ?.users as Record<string, unknown> | Record<string, unknown>[] | null | undefined
  );

  return {
    id: safeText(row.id),
    companyId: safeText(row.company_id),
    budgetId: safeText(row.budget_id),
    siteId: safeText(row.site_id),
    responsibleUserId: safeNullableText(row.responsible_user_id),
    status: (safeText(row.status, "pendiente") as InstallationProject["status"]) ?? "pendiente",
    createdAt: safeNullableText(row.created_at),
    updatedAt: safeNullableText(row.updated_at),
    technicalVisitId: safeNullableText((visit as any)?.id),
    technicalVisitStatus: safeNullableText((visit as any)?.status),
    scheduledStart: safeNullableText((visit as any)?.scheduled_start),
    scheduledEnd: safeNullableText((visit as any)?.scheduled_end),
    technicianId: safeNullableText((visit as any)?.technician_id),
    technicianName: safeNullableText((technician as any)?.name),
  };
}

export async function getInstallationProjectByBudget(
  budgetId: string,
  companyId: string
): Promise<InstallationProject | null> {
  const { data, error } = await supabase
    .from("installation_projects")
    .select(
      `
      id,
      company_id,
      budget_id,
      site_id,
      responsible_user_id,
      status,
      created_at,
      updated_at,
      technical_visits (
        id,
        scheduled_start,
        scheduled_end,
        technician_id,
        status,
        users:technician_id ( id, name )
      )
    `
    )
    .eq("company_id", companyId)
    .eq("budget_id", budgetId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "No se pudo cargar el proyecto de instalacion.");
  }

  if (!data) return null;
  return mapProject(data as Record<string, unknown>);
}

export async function createInstallationProject(input: {
  companyId: string;
  budgetId: string;
  technicianId: string;
  scheduledStart: string;
  scheduledEnd: string | null;
}): Promise<{ projectId: string; technicalVisitId: string | null; created: boolean }> {
  const { data, error } = await supabase
    .rpc("create_installation_project", {
      p_company_id: input.companyId,
      p_budget_id: input.budgetId,
      p_technician_id: input.technicianId,
      p_scheduled_start: input.scheduledStart,
      p_scheduled_end: input.scheduledEnd,
    })
    .single<{ project_id: string; technical_visit_id: string | null; created: boolean }>();

  if (error || !data) {
    throw new Error(error?.message || "No se pudo crear el proyecto de instalacion.");
  }

  await logAuditEvent({
    action: data.created ? "create" : "read",
    entity: "installation_projects",
    entityId: data.project_id,
    companyId: input.companyId,
    newValues: {
      budgetId: input.budgetId,
      technicalVisitId: data.technical_visit_id,
      created: data.created,
    },
  });

  return {
    projectId: safeText(data.project_id),
    technicalVisitId: safeNullableText(data.technical_visit_id),
    created: Boolean(data.created),
  };
}

export async function markInstallationProjectCompleted(input: {
  projectId: string;
  companyId: string;
}): Promise<void> {
  const { error } = await supabase
    .from("installation_projects")
    .update({
      status: "terminado",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.projectId)
    .eq("company_id", input.companyId)
    .neq("status", "terminado");

  if (error) {
    throw new Error(error.message || "No se pudo marcar el proyecto como terminado.");
  }

  await logAuditEvent({
    action: "update",
    entity: "installation_projects",
    entityId: input.projectId,
    companyId: input.companyId,
    newValues: { status: "terminado" },
  });
}

export async function listInstallationHistory(budgetId: string): Promise<InstallationHistoryEntry[]> {
  const { data, error } = await supabase
    .from("installation_projects")
    .select(
      `
      id,
      budget_id,
      status,
      created_at,
      technical_visits (
        id,
        scheduled_start,
        scheduled_end,
        technician_id,
        status,
        users:technician_id ( id, name )
      )
    `
    )
    .eq("budget_id", budgetId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "No se pudo cargar el historial de ordenes.");
  }

  return (data ?? []).map((row) => {
    const visit = pickSingle(
      (row as { technical_visits?: Record<string, unknown> | Record<string, unknown>[] | null | undefined })
        .technical_visits
    );
    const technician = pickSingle(
      (visit as { users?: Record<string, unknown> | Record<string, unknown>[] | null | undefined } | null | undefined)
        ?.users
    );

    return {
      id: safeText((row as any).id),
      budgetId: safeText((row as any).budget_id),
      technicalVisitId: safeNullableText((visit as any)?.id),
      status: safeNullableText((row as any).status),
      createdAt: safeNullableText((row as any).created_at),
      scheduledStart: safeNullableText((visit as any)?.scheduled_start),
      scheduledEnd: safeNullableText((visit as any)?.scheduled_end),
      technicianId: safeNullableText((visit as any)?.technician_id),
      technicianName: safeNullableText((technician as any)?.name),
      visitStatus: safeNullableText((visit as any)?.status),
    };
  });
}
