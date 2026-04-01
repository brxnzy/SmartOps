import { supabase } from "../libs/supabase";

export interface InstallationHistoryEntry {
  id: string;
  budgetId: string;
  surveyId: string;
  technicalVisitId: number | null;
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

export async function createInstallationProject(input: {
  companyId: string;
  budgetId: string;
  surveyId: string;
  technicianId: string | null;
  scheduledStart: string;
  scheduledEnd: string | null;
  createdBy: string | null;
}): Promise<{ projectId: string; technicalVisitId: number | null }> {
  const { data: visitRow, error: visitError } = await supabase
    .from("technical_visits")
    .insert({
      company_id: input.companyId,
      site_survey_id: input.surveyId,
      technician_id: input.technicianId,
      scheduled_start: input.scheduledStart,
      scheduled_end: input.scheduledEnd,
    })
    .select("id")
    .single<{ id: number }>();

  if (visitError) {
    throw new Error(visitError.message || "No se pudo programar la visita tecnica.");
  }

  const { data: projectRow, error: projectError } = await supabase
    .from("proyect_instalation")
    .insert({
      company_id: input.companyId,
      budget_id: input.budgetId,
      survey_id: input.surveyId,
      technical_visit_id: visitRow?.id ?? null,
      status: "pendiente",
      created_by: input.createdBy,
    })
    .select("id")
    .single<{ id: string }>();

  if (projectError || !projectRow) {
    throw new Error(projectError?.message || "No se pudo crear el proyecto de instalacion.");
  }

  return {
    projectId: projectRow.id,
    technicalVisitId: visitRow?.id ?? null,
  };
}

export async function listInstallationHistory(budgetId: string): Promise<InstallationHistoryEntry[]> {
  const { data, error } = await supabase
    .from("proyect_instalation")
    .select(
      `
      id,
      budget_id,
      survey_id,
      technical_visit_id,
      status,
      created_at,
      technical_visits:technical_visit_id (
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
    const visit = row.technical_visits as
      | {
          id?: number;
          scheduled_start?: string | null;
          scheduled_end?: string | null;
          technician_id?: string | null;
          status?: string | null;
          users?: { id?: string | null; name?: string | null } | null;
        }
      | null
      | undefined;

    const technician = visit?.users ?? null;

    return {
      id: safeText(row.id),
      budgetId: safeText(row.budget_id),
      surveyId: safeText(row.survey_id),
      technicalVisitId: typeof row.technical_visit_id === "number" ? row.technical_visit_id : visit?.id ?? null,
      status: safeNullableText(row.status),
      createdAt: safeNullableText(row.created_at),
      scheduledStart: safeNullableText(visit?.scheduled_start),
      scheduledEnd: safeNullableText(visit?.scheduled_end),
      technicianId: safeNullableText(visit?.technician_id),
      technicianName: safeNullableText(technician?.name),
      visitStatus: safeNullableText(visit?.status),
    };
  });
}
