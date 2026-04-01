import { supabase } from "../libs/supabase";
import {
  getChecklistItemsByTemplateIds,
  getChecklistTemplatesByCompany,
} from "./checklistTemplates.service";
import type {
  ChecklistTemplateOption,
  SiteSurveyExecutionSummary,
  SurveyCalendarEvent,
  SurveyCatalogDevice,
  SurveyChecklistItem,
  SurveyExecutionData,
  SurveyLayout,
  SurveyMediaItem,
  SurveyZoneOption,
  TechnicalVisitExecutionSummary,
} from "../types/siteSurveyExecution.types";

const SURVEY_MEDIA_BUCKET = "survey-media";

const MOCK_CHECKLIST_TEMPLATE: ChecklistTemplateOption = {
  id: "mock-general-site-survey",
  name: "Plantilla base (mock)",
  description: "Checklist rapido para iniciar levantamiento tecnico.",
  source: "mock",
  items: [
    { id: "mock-1", text: "Validar alimentacion electrica del sitio", itemOrder: 0 },
    { id: "mock-2", text: "Verificar cobertura de red y puntos de acceso", itemOrder: 1 },
    { id: "mock-3", text: "Inspeccionar riesgos fisicos en zonas criticas", itemOrder: 2 },
    { id: "mock-4", text: "Confirmar ubicacion final de dispositivos", itemOrder: 3 },
  ],
};

function safeText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function safeNullableText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return safeText(value, "");
}

function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function safeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
}

function buildError(error: { message?: string } | null, fallback: string): Error {
  if (!error?.message) return new Error(fallback);
  return new Error(error.message);
}

function pickSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export const EMPTY_SURVEY_LAYOUT: SurveyLayout = {
  walls: [],
  zones: [],
  devices: [],
};

export function normalizeSurveyLayout(value: unknown): SurveyLayout {
  const root = asRecord(value);
  const wallsInput = Array.isArray(root.walls) ? root.walls : [];
  const zonesInput = Array.isArray(root.zones) ? root.zones : [];
  const devicesInput = Array.isArray(root.devices) ? root.devices : [];

  return {
    walls: wallsInput
      .map((wall, index) => {
        const row = asRecord(wall);
        const points = Array.isArray(row.points) ? row.points : [];
        if (points.length < 4) return null;
        return {
          id: safeText(row.id, `wall-${index}`),
          points: [
            safeNumber(points[0]),
            safeNumber(points[1]),
            safeNumber(points[2]),
            safeNumber(points[3]),
          ] as [number, number, number, number],
        };
      })
      .filter((item): item is SurveyLayout["walls"][number] => Boolean(item)),
    zones: zonesInput
      .map((zone, index) => {
        const row = asRecord(zone);
        return {
          id: safeText(row.id, `zone-${index}`),
          name: safeText(row.name, `Zona ${index + 1}`),
          x: safeNumber(row.x),
          y: safeNumber(row.y),
          width: Math.max(24, safeNumber(row.width, 24)),
          height: Math.max(24, safeNumber(row.height, 24)),
          colorIdx: safeNumber(row.colorIdx, index),
          sourceZoneId: safeNullableText(row.sourceZoneId ?? row.source_zone_id),
        };
      })
      .filter(Boolean),
    devices: devicesInput
      .map((device, index) => {
        const row = asRecord(device);
        return {
          id: safeText(row.id, `device-${index}`),
          deviceId: safeText(row.deviceId ?? row.device_id),
          label: safeText(row.label, "Dispositivo"),
          x: safeNumber(row.x),
          y: safeNumber(row.y),
          zoneId: safeNullableText(row.zoneId ?? row.zone_id),
        };
      })
      .filter((item) => Boolean(item.deviceId)),
  };
}

function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export async function listTechnicianVisits(technicianId: string): Promise<SurveyCalendarEvent[]> {
  const { data, error } = await supabase
    .from("technical_visits")
    .select(
      `
      id,
      scheduled_start,
      scheduled_end,
      technician_id,
      site_survey_id,
      status,
      ticket_id,
      users:technician_id ( id, name ),
      site_surveys:site_survey_id (
        id,
        status,
        site_id,
        customer_id,
        customer_sites:site_id ( id, name ),
        customers:customer_id ( user_id, users:users!customers_user_id_fkey ( id, name ) )
      )
    `
    )
    .eq("technician_id", technicianId)
    .order("scheduled_start", { ascending: true });

  if (error) {
    throw buildError(error, "No se pudieron cargar las visitas tecnicas.");
  }

  return (data ?? []).map((row, index) => {
    const surveyRow = pickSingle(
      row.site_surveys as
        | {
            id?: string | null;
            status?: string | null;
            customer_sites?: { id?: string | null; name?: string | null } | { id?: string | null; name?: string | null }[] | null;
            customers?:
              | {
                  users?: { id?: string | null; name?: string | null } | { id?: string | null; name?: string | null }[] | null;
                }
              | {
                  users?: { id?: string | null; name?: string | null } | { id?: string | null; name?: string | null }[] | null;
                }[]
              | null;
          }
        | {
            id?: string | null;
            status?: string | null;
            customer_sites?: { id?: string | null; name?: string | null } | { id?: string | null; name?: string | null }[] | null;
            customers?:
              | {
                  users?: { id?: string | null; name?: string | null } | { id?: string | null; name?: string | null }[] | null;
                }
              | {
                  users?: { id?: string | null; name?: string | null } | { id?: string | null; name?: string | null }[] | null;
                }[]
              | null;
          }[]
        | null
        | undefined
    );

    const siteRow = pickSingle(
      surveyRow?.customer_sites as
        | { id?: string | null; name?: string | null }
        | { id?: string | null; name?: string | null }[]
        | null
        | undefined
    );

    const customerRow = pickSingle(
      surveyRow?.customers as
        | { users?: { id?: string | null; name?: string | null } | { id?: string | null; name?: string | null }[] | null }
        | { users?: { id?: string | null; name?: string | null } | { id?: string | null; name?: string | null }[] | null }[]
        | null
        | undefined
    );

    const customerUser = pickSingle(
      customerRow?.users as
        | { id?: string | null; name?: string | null }
        | { id?: string | null; name?: string | null }[]
        | null
        | undefined
    );

    const technician = pickSingle(
      row.users as
        | { id?: string | null; name?: string | null }
        | { id?: string | null; name?: string | null }[]
        | null
        | undefined
    );

    return {
      visitId: safeNumber(row.id),
      surveyId: safeText(row.site_survey_id, `survey-${index}`),
      scheduledStart: safeText(row.scheduled_start, new Date().toISOString()),
      scheduledEnd: safeNullableText(row.scheduled_end),
      technicianId: safeNullableText(row.technician_id),
      technicianName: safeNullableText(technician?.name),
      status: safeNullableText(row.status),
      ticketId: row.ticket_id ?? null,
      siteName: safeNullableText(siteRow?.name),
      customerName: safeNullableText(customerUser?.name),
      surveyStatus: safeNullableText(surveyRow?.status),
    } satisfies SurveyCalendarEvent;
  });
}

export async function listCompanyVisits(companyId: string): Promise<SurveyCalendarEvent[]> {
  const { data, error } = await supabase
    .from("site_surveys")
    .select(
      `
      id,
      status,
      customer_sites:site_id ( id, name ),
      customers:customer_id ( user_id, users:users!customers_user_id_fkey ( id, name ) ),
      technical_visits (
        id,
        scheduled_start,
        scheduled_end,
        technician_id,
        status,
        ticket_id,
        users:technician_id ( id, name )
      )
    `
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw buildError(error, "No se pudieron cargar las visitas de agenda.");
  }

  const flattened: SurveyCalendarEvent[] = [];

  (data ?? []).forEach((survey, surveyIndex) => {
    const siteRow = pickSingle(
      survey.customer_sites as
        | { id?: string | null; name?: string | null }
        | { id?: string | null; name?: string | null }[]
        | null
        | undefined
    );

    const customerRow = pickSingle(
      survey.customers as
        | { users?: { id?: string | null; name?: string | null } | { id?: string | null; name?: string | null }[] | null }
        | { users?: { id?: string | null; name?: string | null } | { id?: string | null; name?: string | null }[] | null }[]
        | null
        | undefined
    );

    const customerUser = pickSingle(
      customerRow?.users as
        | { id?: string | null; name?: string | null }
        | { id?: string | null; name?: string | null }[]
        | null
        | undefined
    );

    const visits = Array.isArray(survey.technical_visits)
      ? survey.technical_visits
      : survey.technical_visits
        ? [survey.technical_visits]
        : [];

    visits.forEach((visit, visitIndex) => {
      const technician = pickSingle(
        visit.users as
          | { id?: string | null; name?: string | null }
          | { id?: string | null; name?: string | null }[]
          | null
          | undefined
      );

      flattened.push({
        visitId: safeNumber(visit.id),
        surveyId: safeText(survey.id, `survey-${surveyIndex}-${visitIndex}`),
        scheduledStart: safeText(visit.scheduled_start, new Date().toISOString()),
        scheduledEnd: safeNullableText(visit.scheduled_end),
        technicianId: safeNullableText(visit.technician_id),
        technicianName: safeNullableText(technician?.name),
        status: safeNullableText(visit.status),
        ticketId: visit.ticket_id ?? null,
        siteName: safeNullableText(siteRow?.name),
        customerName: safeNullableText(customerUser?.name),
        surveyStatus: safeNullableText(survey.status),
      });
    });
  });

  return flattened.sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
}

export async function startSurveyVisit(visitId: number, surveyId: string): Promise<void> {
  const { error: visitError } = await supabase
    .from("technical_visits")
    .update({ status: "En Progreso" })
    .eq("id", visitId);

  if (visitError) {
    throw buildError(visitError, "No se pudo iniciar la visita tecnica.");
  }

  const { error: surveyError } = await supabase
    .from("site_surveys")
    .update({ status: "En Progreso" })
    .eq("id", surveyId);

  if (surveyError) {
    throw buildError(surveyError, "No se pudo actualizar el levantamiento.");
  }
}

export async function getSurveyExecutionData(
  surveyId: string,
  companyId: string
): Promise<SurveyExecutionData> {
  const { data: surveyData, error: surveyError } = await supabase
    .from("site_surveys")
    .select(
      `
      id,
      customer_id,
      site_id,
      company_id,
      status,
      completed_at,
      requirements,
      observations,
      recomendations,
      risks,
      layout_json,
      customer_sites:site_id ( id, name ),
      customers:customer_id ( user_id, users:users!customers_user_id_fkey ( id, name ) )
    `
    )
    .eq("id", surveyId)
    .maybeSingle();

  if (surveyError) {
    throw buildError(surveyError, "No se pudo cargar el levantamiento tecnico.");
  }

  if (!surveyData) {
    throw new Error("No se encontro el levantamiento tecnico solicitado.");
  }

  const surveyCompanyId = safeNullableText(surveyData.company_id);
  if (surveyCompanyId && surveyCompanyId !== companyId) {
    throw new Error("No tienes acceso a este levantamiento tecnico.");
  }

  const siteRow = pickSingle(
    surveyData.customer_sites as
      | { id?: string | null; name?: string | null }
      | { id?: string | null; name?: string | null }[]
      | null
      | undefined
  );

  const customerRow = pickSingle(
    surveyData.customers as
      | { users?: { id?: string | null; name?: string | null } | { id?: string | null; name?: string | null }[] | null }
      | { users?: { id?: string | null; name?: string | null } | { id?: string | null; name?: string | null }[] | null }[]
      | null
      | undefined
  );

  const customerUser = pickSingle(
    customerRow?.users as
      | { id?: string | null; name?: string | null }
      | { id?: string | null; name?: string | null }[]
      | null
      | undefined
  );

  const [visit, checklistItems, zones, catalogDevices, media] = await Promise.all([
    getSurveyVisitBySurveyId(surveyId),
    listSurveyChecklistItems(surveyId),
    listSurveyZonesBySite(safeNullableText(surveyData.site_id), companyId),
    listCompanyCatalogDevices(companyId),
    listSurveyMedia(surveyId),
  ]);

  const summary: SiteSurveyExecutionSummary = {
    id: safeText(surveyData.id),
    customerId: safeNullableText(surveyData.customer_id),
    siteId: safeNullableText(surveyData.site_id),
    companyId: safeNullableText(surveyData.company_id),
    status: safeNullableText(surveyData.status),
    completedAt: safeNullableText(surveyData.completed_at),
    requirements: safeNullableText(surveyData.requirements),
    observations: safeNullableText(surveyData.observations),
    recomendations: safeNullableText(surveyData.recomendations),
    risks: safeNullableText(surveyData.risks),
    layout: normalizeSurveyLayout(surveyData.layout_json),
    siteName: safeNullableText(siteRow?.name),
    customerName: safeNullableText(customerUser?.name),
  };

  return {
    survey: summary,
    visit,
    checklistItems,
    zones,
    catalogDevices,
    media,
  };
}

export async function getSurveyVisitBySurveyId(
  surveyId: string
): Promise<TechnicalVisitExecutionSummary | null> {
  const { data, error } = await supabase
    .from("technical_visits")
    .select("id, site_survey_id, scheduled_start, scheduled_end, technician_id, status, ticket_id")
    .eq("site_survey_id", surveyId)
    .order("scheduled_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw buildError(error, "No se pudo cargar la visita tecnica.");
  }

  if (!data) return null;

  return {
    id: safeNumber(data.id),
    siteSurveyId: safeText(data.site_survey_id),
    scheduledStart: safeText(data.scheduled_start),
    scheduledEnd: safeNullableText(data.scheduled_end),
    technicianId: safeNullableText(data.technician_id),
    status: safeNullableText(data.status),
    ticketId: data.ticket_id ?? null,
  };
}

export async function listSurveyChecklistItems(
  surveyId: string
): Promise<SurveyChecklistItem[]> {
  const { data, error } = await supabase
    .from("site_survey_checklist_items")
    .select("id, site_survey_id, text, checked, notes, source_checklist_item_id, is_custom, item_order")
    .eq("site_survey_id", surveyId)
    .order("item_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw buildError(error, "No se pudo cargar el checklist del levantamiento.");
  }

  return (data ?? []).map((row, index) => ({
    id: safeText(row.id, `item-${index}`),
    siteSurveyId: safeText(row.site_survey_id),
    text: safeText(row.text, `Item ${index + 1}`),
    checked: safeBoolean(row.checked),
    notes: safeNullableText(row.notes),
    sourceChecklistItemId: safeNullableText(row.source_checklist_item_id),
    isCustom: safeBoolean(row.is_custom),
    itemOrder: safeNumber(row.item_order, index),
  }));
}

export async function listChecklistTemplatesForSurvey(
  companyId: string
): Promise<ChecklistTemplateOption[]> {
  const templates = await getChecklistTemplatesByCompany(companyId);
  if (templates.length === 0) {
    return [MOCK_CHECKLIST_TEMPLATE];
  }

  const templateIds = templates.map((template) => template.id);
  const items = await getChecklistItemsByTemplateIds(templateIds);

  const grouped = new Map<string, ChecklistTemplateOption["items"]>();
  for (const item of items) {
    const current = grouped.get(item.templateId) ?? [];
    current.push({
      id: item.id,
      text: item.text,
      itemOrder: item.itemOrder,
    });
    grouped.set(item.templateId, current);
  }

  const options: ChecklistTemplateOption[] = templates.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    source: "db",
    items: (grouped.get(template.id) ?? []).sort((a, b) => a.itemOrder - b.itemOrder),
  }));

  return [MOCK_CHECKLIST_TEMPLATE, ...options];
}

export async function applyChecklistTemplateToSurvey(
  surveyId: string,
  template: ChecklistTemplateOption
): Promise<SurveyChecklistItem[]> {
  return applyChecklistTemplatesToSurvey(surveyId, [template]);
}

export async function applyChecklistTemplatesToSurvey(
  surveyId: string,
  templates: ChecklistTemplateOption[]
): Promise<SurveyChecklistItem[]> {
  if (templates.length === 0) return [];

  const payload: Array<{
    site_survey_id: string;
    text: string;
    checked: boolean;
    notes: null;
    source_checklist_item_id: string | null;
    is_custom: boolean;
    item_order: number;
  }> = [];
  const uniqueTexts = new Set<string>();
  let orderIndex = 0;

  templates.forEach((template) => {
    const sortedItems = [...template.items].sort((a, b) => a.itemOrder - b.itemOrder);

    sortedItems.forEach((item) => {
      const text = item.text.trim();
      if (!text) return;

      const normalized = text.toLowerCase();
      if (uniqueTexts.has(normalized)) return;
      uniqueTexts.add(normalized);

      payload.push({
        site_survey_id: surveyId,
        text,
        checked: false,
        notes: null,
        source_checklist_item_id: template.source === "db" ? item.id : null,
        is_custom: false,
        item_order: orderIndex,
      });
      orderIndex += 1;
    });
  });

  if (payload.length === 0) return [];

  const { data, error } = await supabase
    .from("site_survey_checklist_items")
    .insert(payload)
    .select("id, site_survey_id, text, checked, notes, source_checklist_item_id, is_custom, item_order")
    .order("item_order", { ascending: true });

  if (error) {
    throw buildError(error, "No se pudo aplicar la plantilla de checklist.");
  }

  return (data ?? []).map((row, index) => ({
    id: safeText(row.id, `item-${index}`),
    siteSurveyId: safeText(row.site_survey_id),
    text: safeText(row.text),
    checked: safeBoolean(row.checked),
    notes: safeNullableText(row.notes),
    sourceChecklistItemId: safeNullableText(row.source_checklist_item_id),
    isCustom: safeBoolean(row.is_custom),
    itemOrder: safeNumber(row.item_order, index),
  }));
}

export async function createCustomChecklistItem(
  surveyId: string,
  text: string,
  itemOrder: number
): Promise<SurveyChecklistItem> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("El texto del item es obligatorio.");
  }

  const { data, error } = await supabase
    .from("site_survey_checklist_items")
    .insert({
      site_survey_id: surveyId,
      text: trimmed,
      checked: false,
      notes: null,
      source_checklist_item_id: null,
      is_custom: true,
      item_order: itemOrder,
    })
    .select("id, site_survey_id, text, checked, notes, source_checklist_item_id, is_custom, item_order")
    .single();

  if (error || !data) {
    throw buildError(error, "No se pudo crear el item personalizado.");
  }

  return {
    id: safeText(data.id),
    siteSurveyId: safeText(data.site_survey_id),
    text: safeText(data.text),
    checked: safeBoolean(data.checked),
    notes: safeNullableText(data.notes),
    sourceChecklistItemId: safeNullableText(data.source_checklist_item_id),
    isCustom: safeBoolean(data.is_custom),
    itemOrder: safeNumber(data.item_order),
  };
}

export async function updateSurveyChecklistItem(
  itemId: string,
  patch: {
    text?: string;
    checked?: boolean;
    notes?: string | null;
    itemOrder?: number;
  }
): Promise<void> {
  const payload: Record<string, unknown> = {};

  if (patch.text !== undefined) payload.text = patch.text;
  if (patch.checked !== undefined) payload.checked = patch.checked;
  if (patch.notes !== undefined) payload.notes = patch.notes;
  if (patch.itemOrder !== undefined) payload.item_order = patch.itemOrder;

  if (Object.keys(payload).length === 0) return;

  const { error } = await supabase
    .from("site_survey_checklist_items")
    .update(payload)
    .eq("id", itemId);

  if (error) {
    throw buildError(error, "No se pudo actualizar el item del checklist.");
  }
}

export async function deleteSurveyChecklistItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from("site_survey_checklist_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    throw buildError(error, "No se pudo eliminar el item del checklist.");
  }
}

export async function updateSurveyForm(
  surveyId: string,
  patch: {
    requirements?: string | null;
    observations?: string | null;
    recomendations?: string | null;
    risks?: string | null;
    status?: string | null;
  }
): Promise<void> {
  const { error } = await supabase.from("site_surveys").update({
    requirements: patch.requirements,
    observations: patch.observations,
    recomendations: patch.recomendations,
    risks: patch.risks,
    status: patch.status,
  }).eq("id", surveyId);

  if (error) {
    throw buildError(error, "No se pudo guardar el formulario del levantamiento.");
  }
}

export async function saveSurveyLayout(
  surveyId: string,
  layout: SurveyLayout
): Promise<void> {
  const { error } = await supabase
    .from("site_surveys")
    .update({ layout_json: layout })
    .eq("id", surveyId);

  if (error) {
    throw buildError(error, "No se pudo guardar el plano del levantamiento.");
  }
}

export async function finalizeSurveyExecution(
  surveyId: string,
  visitId: number | null
): Promise<void> {
  const { error: surveyError } = await supabase
    .from("site_surveys")
    .update({
      status: "Completado",
      completed_at: new Date().toISOString(),
    })
    .eq("id", surveyId);

  if (surveyError) {
    throw buildError(surveyError, "No se pudo finalizar el levantamiento.");
  }

  if (visitId) {
    const { error: visitError } = await supabase
      .from("technical_visits")
      .update({ status: "Completada" })
      .eq("id", visitId);

    if (visitError) {
      throw buildError(visitError, "No se pudo actualizar el estado de la visita tecnica.");
    }
    return;
  }

  const { error: visitsError } = await supabase
    .from("technical_visits")
    .update({ status: "Completada" })
    .eq("site_survey_id", surveyId);

  if (visitsError) {
    throw buildError(visitsError, "No se pudo actualizar el estado de la visita tecnica.");
  }
}

export async function listSurveyZonesBySite(
  siteId: string | null,
  companyId: string
): Promise<SurveyZoneOption[]> {
  if (!siteId) return [];

  const { data, error } = await supabase
    .from("customer_site_zones")
    .select("id, customer_site_id, company_id, name")
    .eq("customer_site_id", siteId)
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (error) {
    throw buildError(error, "No se pudieron cargar las zonas del sitio.");
  }

  return (data ?? []).map((row) => ({
    id: safeText(row.id),
    customerSiteId: safeText(row.customer_site_id),
    companyId: safeText(row.company_id),
    name: safeText(row.name, "Zona"),
  }));
}

export async function listCompanyCatalogDevices(
  companyId: string
): Promise<SurveyCatalogDevice[]> {
  const { data, error } = await supabase
    .from("devices")
    .select("id, name, model, price, installation_price")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (error) {
    throw buildError(error, "No se pudo cargar el catalogo de dispositivos.");
  }

  return (data ?? []).map((row) => {
    const name = safeText(row.name, "Dispositivo");
    const model = safeText(row.model, "");
    return {
      id: safeText(row.id),
      name,
      model,
      label: model ? `${name} (${model})` : name,
      price: safeNumber(row.price, 0),
      installationPrice:
        row.installation_price === null || row.installation_price === undefined
          ? null
          : safeNumber(row.installation_price, 0),
    };
  });
}

async function getSignedMediaUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(SURVEY_MEDIA_BUCKET)
    .createSignedUrl(filePath, 60 * 60);

  if (error || !data?.signedUrl) {
    throw buildError(error, "No se pudo obtener acceso al archivo multimedia.");
  }

  return data.signedUrl;
}

export async function listSurveyMedia(surveyId: string): Promise<SurveyMediaItem[]> {
  const { data, error } = await supabase
    .from("survey_media")
    .select("id, survey_id, file_path, file_type, category, description, zone_id, created_at")
    .eq("survey_id", surveyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw buildError(error, "No se pudo cargar la multimedia del levantamiento.");
  }

  const media = await Promise.all(
    (data ?? []).map(async (row) => ({
      id: safeText(row.id),
      surveyId: safeText(row.survey_id),
      filePath: safeText(row.file_path),
      fileType: safeNullableText(row.file_type),
      category: safeNullableText(row.category),
      description: safeNullableText(row.description),
      zoneId: safeNullableText(row.zone_id),
      createdAt: safeNullableText(row.created_at),
      signedUrl: await getSignedMediaUrl(safeText(row.file_path)),
    }))
  );

  return media;
}

export async function uploadSurveyMediaFiles(input: {
  companyId: string;
  surveyId: string;
  files: File[];
  category: string | null;
  zoneId: string | null;
  description: string | null;
}): Promise<void> {
  if (input.files.length === 0) return;

  for (const file of input.files) {
    const safeName = sanitizeFileName(file.name || "archivo");
    const filePath = `${input.companyId}/${input.surveyId}/${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(SURVEY_MEDIA_BUCKET)
      .upload(filePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      throw buildError(uploadError, "No se pudo subir el archivo multimedia.");
    }

    const { error: insertError } = await supabase
      .from("survey_media")
      .insert({
        survey_id: input.surveyId,
        file_path: filePath,
        file_type: file.type || null,
        category: input.category,
        description: input.description,
        zone_id: input.zoneId,
      });

    if (insertError) {
      await supabase.storage.from(SURVEY_MEDIA_BUCKET).remove([filePath]);
      throw buildError(insertError, "No se pudo registrar el archivo multimedia.");
    }
  }
}

export async function updateSurveyMediaMetadata(
  mediaId: string,
  patch: {
    category?: string | null;
    description?: string | null;
    zoneId?: string | null;
  }
): Promise<void> {
  const payload: Record<string, unknown> = {};

  if (patch.category !== undefined) payload.category = patch.category;
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.zoneId !== undefined) payload.zone_id = patch.zoneId;

  if (Object.keys(payload).length === 0) return;

  const { error } = await supabase
    .from("survey_media")
    .update(payload)
    .eq("id", mediaId);

  if (error) {
    throw buildError(error, "No se pudo actualizar la metadata del archivo multimedia.");
  }
}

export async function deleteSurveyMedia(mediaId: string, filePath: string): Promise<void> {
  const { error: deleteError } = await supabase
    .from("survey_media")
    .delete()
    .eq("id", mediaId);

  if (deleteError) {
    throw buildError(deleteError, "No se pudo eliminar el registro multimedia.");
  }

  const { error: storageError } = await supabase.storage
    .from(SURVEY_MEDIA_BUCKET)
    .remove([filePath]);

  if (storageError) {
    throw buildError(storageError, "No se pudo eliminar el archivo multimedia.");
  }
}
