import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../libs/supabase";
import type {
  SiteSurveyChecklistItem,
  SiteSurveyCreateInput,
  SiteSurveySummary,
  SiteSurveyUpdateInput,
  SimpleOption,
} from "../types/siteSurvey.types";

function safeText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function safeNullableText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return safeText(value, "");
}

function safeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function safeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
}

function buildErrorMessage(error: PostgrestError | null, fallback: string): string {
  if (!error) return fallback;
  return error.message || fallback;
}

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value.length ? value[0] : null;
  return value;
}

export async function listSiteSurveys(companyId: string): Promise<SiteSurveySummary[]> {
  const { data, error } = await supabase
    .from("site_surveys")
    .select(
      `
      id,
      created_at,
      status,
      completed_at,
      customer_id,
      site_id,
      company_id,
      requirements,
      observations,
      recomendations,
      risks,
      customer_sites:site_id ( id, name ),
      customers:customer_id ( user_id, users:users!customers_user_id_fkey ( id, name ) ),
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
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(buildErrorMessage(error, "No se pudieron cargar los levantamientos."));
  }

  return (data ?? []).map((row) => {
    const customer = pickFirst(row.customers as unknown as { user_id?: string | null; users?: { id?: string; name?: string } | null });
    const site = pickFirst(row.customer_sites as unknown as { id?: string | null; name?: string | null });
    const visits = Array.isArray(row.technical_visits)
      ? row.technical_visits
      : row.technical_visits
        ? [row.technical_visits]
        : [];
    const sortedVisits = visits
      .filter((visit) => visit)
      .sort((a, b) => {
        const aTime = a.scheduled_start ? new Date(a.scheduled_start).getTime() : 0;
        const bTime = b.scheduled_start ? new Date(b.scheduled_start).getTime() : 0;
        return bTime - aTime;
      });
    const visit = sortedVisits.length ? sortedVisits[0] : null;
    const technician = pickFirst(
      visit?.users as
        | { id?: string | null; name?: string | null }
        | { id?: string | null; name?: string | null }[]
        | null
        | undefined
    );

    return {
      id: safeText(row.id),
      createdAt: safeText(row.created_at ?? new Date().toISOString()),
      status: safeNullableText(row.status),
      completedAt: safeNullableText(row.completed_at),
      companyId: safeNullableText(row.company_id),
      customerId: safeNullableText(row.customer_id),
      customerName: safeNullableText(customer?.users?.name),
      siteId: safeNullableText(row.site_id),
      siteName: safeNullableText(site?.name),
      requirements: safeNullableText(row.requirements),
      observations: safeNullableText(row.observations),
      recomendations: safeNullableText(row.recomendations),
      risks: safeNullableText(row.risks),
      visitId: safeNumber(visit?.id),
      scheduledStart: safeNullableText(visit?.scheduled_start),
      scheduledEnd: safeNullableText(visit?.scheduled_end),
      technicianId: safeNullableText(visit?.technician_id),
      technicianName: safeNullableText(technician?.name),
      visitStatus: safeNullableText(visit?.status),
    } satisfies SiteSurveySummary;
  });
}

export async function createSiteSurvey(companyId: string, input: SiteSurveyCreateInput): Promise<void> {
  const { data: surveyRow, error: surveyError } = await supabase
    .from("site_surveys")
    .insert({
      company_id: companyId,
      customer_id: input.customerId,
      site_id: input.siteId,
    })
    .select("id")
    .single<{ id: string }>();

  if (surveyError || !surveyRow?.id) {
    throw new Error(buildErrorMessage(surveyError, "No se pudo crear el levantamiento."));
  }

  const { error: visitError } = await supabase
    .from("technical_visits")
    .insert({
      site_survey_id: surveyRow.id,
      technician_id: input.technicianId,
      scheduled_start: input.scheduledStart,
      scheduled_end: input.scheduledEnd ?? null,
    });

  if (visitError) {
    await supabase.from("site_surveys").delete().eq("id", surveyRow.id);
    throw new Error(buildErrorMessage(visitError, "No se pudo agendar la visita tecnica."));
  }
}

export async function listSiteSurveyChecklistItems(siteSurveyId: string): Promise<SiteSurveyChecklistItem[]> {
  const { data, error } = await supabase
    .from("site_survey_checklist_items")
    .select("id, site_survey_id, text, checked, notes, source_checklist_item_id, is_custom, item_order, created_at")
    .eq("site_survey_id", siteSurveyId)
    .order("item_order", { ascending: true });

  if (error) {
    throw new Error(buildErrorMessage(error, "No se pudieron cargar los items del checklist."));
  }

  return (data ?? []).map((row, index) => ({
    id: safeText(row.id, `item-${index}`),
    siteSurveyId: safeText(row.site_survey_id),
    text: safeText(row.text, `Item ${index + 1}`),
    checked: safeBoolean(row.checked),
    notes: safeNullableText(row.notes),
    sourceChecklistItemId: safeNullableText(row.source_checklist_item_id),
    isCustom: safeBoolean(row.is_custom),
    itemOrder: typeof row.item_order === "number" ? row.item_order : index,
    createdAt: safeNullableText(row.created_at),
  }));
}

export async function updateSiteSurvey(siteSurveyId: string, input: SiteSurveyUpdateInput): Promise<void> {
  const { error } = await supabase.from("site_surveys").update({
    requirements: input.requirements,
    observations: input.observations,
    recomendations: input.recomendations,
    risks: input.risks,
    status: input.status,
    completed_at: input.completedAt,
  }).eq("id", siteSurveyId);

  if (error) {
    throw new Error(buildErrorMessage(error, "No se pudo actualizar el levantamiento."));
  }
}

export async function upsertSiteSurveyChecklistItems(items: SiteSurveyChecklistItem[]): Promise<void> {
  if (items.length === 0) return;

  const payload = items.map((item) => ({
    id: item.id,
    site_survey_id: item.siteSurveyId,
    text: item.text,
    checked: item.checked,
    notes: item.notes,
    source_checklist_item_id: item.sourceChecklistItemId,
    is_custom: item.isCustom,
    item_order: item.itemOrder,
  }));

  const { error } = await supabase
    .from("site_survey_checklist_items")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    throw new Error(buildErrorMessage(error, "No se pudieron actualizar los items del checklist."));
  }
}

export async function listCustomerSites(companyId: string, customerId: string): Promise<SimpleOption[]> {
  const { data, error } = await supabase
    .from("customer_sites")
    .select("id, name")
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(buildErrorMessage(error, "No se pudieron cargar los sitios del cliente."));
  }

  return (data ?? []).map((row) => ({
    id: safeText(row.id),
    name: safeText(row.name, "Sitio"),
  }));
}
