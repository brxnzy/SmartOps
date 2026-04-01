import { supabase } from "../libs/supabase";
import { logAuditEvent } from "./audit.service";
import {
  getChecklistItemsByTemplateIds,
  getChecklistTemplatesByCompany,
} from "./checklistTemplates.service";
import {
  canCancelSurveyStatus,
  canCancelVisitStatus,
  canRescheduleVisitStatus,
  canStartVisitStatus,
  isSurveyCompletedStatus,
  normalizeSurveyStatus,
  normalizeVisitStatus,
} from "../utils/siteSurveyWorkflow";
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

type BasicUserRow = { id?: string | null; name?: string | null };
type SiteRow = { id?: string | null; name?: string | null };
type SurveyCustomerRow = { users?: BasicUserRow | BasicUserRow[] | null };
type SurveyNestedRow = {
  id?: string | null;
  status?: string | null;
  customer_sites?: SiteRow | SiteRow[] | null;
  customers?: SurveyCustomerRow | SurveyCustomerRow[] | null;
};
type TicketNestedRow = {
  id?: string | null;
  customer_id?: string | null;
  site?: SiteRow | SiteRow[] | null;
};
type TechnicalVisitCalendarRow = {
  id?: string | number | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  technician_id?: string | null;
  site_survey_id?: string | null;
  status?: string | null;
  ticket_id?: string | number | null;
  installation_project_id?: string | null;
  users?: BasicUserRow | BasicUserRow[] | null;
  site_surveys?: SurveyNestedRow | SurveyNestedRow[] | null;
  tickets?: TicketNestedRow | TicketNestedRow[] | null;
};

type TechnicalVisitStatusGuardRow = {
  id: string;
  company_id?: string | null;
  site_survey_id: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  technician_id?: string | null;
  status: string | null;
  ticket_id: string | number | null;
  installation_project_id: string | null;
};

type SiteSurveyStatusGuardRow = {
  id: string;
  company_id?: string | null;
  status: string | null;
  completed_at: string | null;
};

export interface RescheduleTechnicalVisitInput {
  visitId: string;
  scheduledStart: string;
  scheduledEnd?: string | null;
  technicianId?: string | null;
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
      installation_project_id,
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
    .is("ticket_id", null)
    .is("installation_project_id", null)
    .order("scheduled_start", { ascending: true });

  if (error) {
    throw buildError(error, "No se pudieron cargar las visitas tecnicas.");
  }

  return ((data ?? []) as TechnicalVisitCalendarRow[]).map((row, index) => {
    const surveyRow = pickSingle(row.site_surveys);
    const siteRow = pickSingle(surveyRow?.customer_sites);
    const customerRow = pickSingle(surveyRow?.customers);
    const customerUser = pickSingle(customerRow?.users);
    const technician = pickSingle(row.users);

    return {
      visitId: safeText(row.id),
      surveyId: safeText(row.site_survey_id, `survey-${index}`),
      scheduledStart: safeText(row.scheduled_start, new Date().toISOString()),
      scheduledEnd: safeNullableText(row.scheduled_end),
      technicianId: safeNullableText(row.technician_id),
      technicianName: safeNullableText(technician?.name),
      status: normalizeVisitStatus(safeNullableText(row.status)) ?? "programada",
      ticketId: row.ticket_id ?? null,
      installationProjectId: safeNullableText(row.installation_project_id),
      visitType: row.installation_project_id ? "installation" : row.ticket_id ? "ticket" : "survey",
      siteName: safeNullableText(siteRow?.name),
      customerName: safeNullableText(customerUser?.name),
      surveyStatus: normalizeSurveyStatus(safeNullableText(surveyRow?.status)) ?? "pendiente",
    } satisfies SurveyCalendarEvent;
  });
}

export async function listCompanyVisits(companyId: string): Promise<SurveyCalendarEvent[]> {
  const { data, error } = await supabase
    .from("technical_visits")
    .select(
      `
      id,
      scheduled_start,
      scheduled_end,
      technician_id,
      status,
      ticket_id,
      installation_project_id,
      users:technician_id ( id, name ),
      site_surveys:site_survey_id (
        id,
        status,
        customer_sites:site_id ( id, name ),
        customers:customer_id ( user_id, users:users!customers_user_id_fkey ( id, name ) )
      ),
      tickets:ticket_id (
        id,
        customer_id,
        site:site_id ( id, name )
      )
    `
    )
    .eq("company_id", companyId)
    .order("scheduled_start", { ascending: true });

  if (error) {
    throw buildError(error, "No se pudieron cargar las visitas de agenda.");
  }

  const visitRows = (data ?? []) as TechnicalVisitCalendarRow[];

  const ticketCustomerIds = Array.from(
    new Set(
      visitRows
        .map((visit) => {
          const ticketRow = pickSingle(visit.tickets);
          return safeNullableText(ticketRow?.customer_id);
        })
        .filter((value): value is string => Boolean(value))
    )
  );

  const customerNameById = new Map<string, string>();
  if (ticketCustomerIds.length > 0) {
    const { data: usersData } = await supabase
      .from("users")
      .select("id, name")
      .in("id", ticketCustomerIds)
      .returns<Array<{ id: string; name: string | null }>>();

    (usersData ?? []).forEach((user) => {
      customerNameById.set(user.id, user.name ?? user.id);
    });
  }

  return visitRows.map((visit) => {
    const surveyRow = pickSingle(visit.site_surveys);
    const ticketRow = pickSingle(visit.tickets);
    const surveySite = pickSingle(surveyRow?.customer_sites);
    const ticketSite = pickSingle(ticketRow?.site);
    const surveyCustomer = pickSingle(surveyRow?.customers);
    const surveyCustomerUser = pickSingle(surveyCustomer?.users);
    const technician = pickSingle(visit.users);
    const visitType = visit.installation_project_id
      ? "installation"
      : visit.ticket_id
        ? "ticket"
        : "survey";

    return {
      visitId: safeText(visit.id),
      surveyId: safeText(surveyRow?.id),
      scheduledStart: safeText(visit.scheduled_start, new Date().toISOString()),
      scheduledEnd: safeNullableText(visit.scheduled_end),
      technicianId: safeNullableText(visit.technician_id),
      technicianName: safeNullableText(technician?.name),
      status: normalizeVisitStatus(safeNullableText(visit.status)) ?? "programada",
      ticketId: visit.ticket_id ?? null,
      installationProjectId: safeNullableText(visit.installation_project_id),
      visitType,
      siteName: safeNullableText(ticketSite?.name) ?? safeNullableText(surveySite?.name),
      customerName:
        customerNameById.get(safeText(ticketRow?.customer_id, "")) ??
        safeNullableText(surveyCustomerUser?.name),
      surveyStatus: surveyRow
        ? normalizeSurveyStatus(safeNullableText(surveyRow?.status)) ?? "pendiente"
        : null,
    } satisfies SurveyCalendarEvent;
  });
}

export async function startSurveyVisit(visitId: string, surveyId: string): Promise<void> {
  const [{ data: visitData, error: visitLoadError }, { data: surveyData, error: surveyLoadError }] = await Promise.all([
    supabase
      .from("technical_visits")
      .select("id, company_id, site_survey_id, status, ticket_id, installation_project_id")
      .eq("id", visitId)
      .maybeSingle<TechnicalVisitStatusGuardRow>(),
    supabase
      .from("site_surveys")
      .select("id, company_id, status, completed_at")
      .eq("id", surveyId)
      .maybeSingle<SiteSurveyStatusGuardRow>(),
  ]);

  if (visitLoadError) {
    throw buildError(visitLoadError, "No se pudo validar la visita tecnica.");
  }
  if (surveyLoadError) {
    throw buildError(surveyLoadError, "No se pudo validar el levantamiento.");
  }
  if (!visitData) {
    throw new Error("La visita tecnica no existe.");
  }
  if (!surveyData) {
    throw new Error("El levantamiento tecnico no existe.");
  }

  const visitSurveyId = safeNullableText(visitData.site_survey_id);
  if (!visitSurveyId || visitSurveyId !== surveyId) {
    throw new Error("La visita tecnica no pertenece al levantamiento solicitado.");
  }

  if (visitData.ticket_id !== null || safeNullableText(visitData.installation_project_id)) {
    throw new Error("Solo se puede iniciar la visita del levantamiento.");
  }

  const normalizedVisitStatus = normalizeVisitStatus(visitData.status);
  if (normalizedVisitStatus === "cancelada") {
    throw new Error("No se puede iniciar una visita cancelada.");
  }
  if (normalizedVisitStatus === "completada") {
    throw new Error("No se puede iniciar una visita completada.");
  }
  if (normalizedVisitStatus !== "en_progreso" && !canStartVisitStatus(normalizedVisitStatus)) {
    throw new Error("La visita debe estar programada para poder iniciar.");
  }

  if (isSurveyCompletedStatus(surveyData.status) || Boolean(surveyData.completed_at)) {
    throw new Error("No se puede iniciar una visita de un levantamiento completado.");
  }
  if (normalizeSurveyStatus(surveyData.status) === "cancelado") {
    throw new Error("No se puede iniciar una visita de un levantamiento cancelado.");
  }

  const { error: visitError } = await supabase
    .from("technical_visits")
    .update({ status: "en_progreso" })
    .eq("id", visitId);

  if (visitError) {
    throw buildError(visitError, "No se pudo iniciar la visita tecnica.");
  }

  const { error: surveyError } = await supabase
    .from("site_surveys")
    .update({ status: "en_progreso" })
    .eq("id", surveyId);

  if (surveyError) {
    throw buildError(surveyError, "No se pudo actualizar el levantamiento.");
  }

  await logAuditEvent({
    action: "start",
    entity: "site_survey_visit",
    entityId: surveyId,
    newValues: {
      visitId,
      visitStatus: "en_progreso",
      surveyStatus: "en_progreso",
      previousVisitStatus: normalizedVisitStatus,
    },
  });
}

function parseDateToIso(value: string, fieldName: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`La fecha de ${fieldName} no es valida.`);
  }
  return new Date(parsed).toISOString();
}

export async function cancelTechnicalVisit(visitId: string): Promise<void> {
  const { data: visitData, error: visitLoadError } = await supabase
    .from("technical_visits")
    .select("id, company_id, site_survey_id, status, ticket_id, installation_project_id")
    .eq("id", visitId)
    .maybeSingle<TechnicalVisitStatusGuardRow>();

  if (visitLoadError) {
    throw buildError(visitLoadError, "No se pudo validar la visita tecnica.");
  }
  if (!visitData) {
    throw new Error("La visita tecnica no existe.");
  }

  const normalizedVisitStatus = normalizeVisitStatus(visitData.status);
  if (normalizedVisitStatus === "completada") {
    throw new Error("No se puede cancelar una visita tecnica completada.");
  }
  if (normalizedVisitStatus === "cancelada") {
    return;
  }
  if (!canCancelVisitStatus(normalizedVisitStatus)) {
    throw new Error("La visita tecnica no se puede cancelar en su estado actual.");
  }

  const linkedSurveyId = safeNullableText(visitData.site_survey_id);
  let nextSurveyStatus: string | null = null;
  let shouldSetSurveyPending = false;

  if (linkedSurveyId) {
    const { data: surveyData, error: surveyLoadError } = await supabase
      .from("site_surveys")
      .select("id, status, completed_at")
      .eq("id", linkedSurveyId)
      .maybeSingle<SiteSurveyStatusGuardRow>();

    if (surveyLoadError) {
      throw buildError(surveyLoadError, "No se pudo validar el levantamiento asociado.");
    }

    if (surveyData) {
      if (isSurveyCompletedStatus(surveyData.status) || Boolean(surveyData.completed_at)) {
        throw new Error("No se puede cancelar la visita: el levantamiento ya esta completado.");
      }

      const normalizedSurveyStatus = normalizeSurveyStatus(surveyData.status);
      nextSurveyStatus = normalizedSurveyStatus;

      if (normalizedSurveyStatus === "en_progreso") {
        shouldSetSurveyPending = true;
      }
    }
  }

  const { error: cancelError } = await supabase
    .from("technical_visits")
    .update({ status: "cancelada" })
    .eq("id", visitId);

  if (cancelError) {
    throw buildError(cancelError, "No se pudo cancelar la visita tecnica.");
  }

  if (linkedSurveyId && shouldSetSurveyPending) {
    const { error: surveyUpdateError } = await supabase
      .from("site_surveys")
      .update({ status: "pendiente" })
      .eq("id", linkedSurveyId);

    if (surveyUpdateError) {
      throw buildError(surveyUpdateError, "La visita fue cancelada, pero no se pudo ajustar el estado del levantamiento.");
    }
    nextSurveyStatus = "pendiente";
  }

  await logAuditEvent({
    action: "cancel",
    entity: "technical_visits",
    entityId: visitId,
    companyId: safeNullableText(visitData.company_id),
    newValues: {
      visitId,
      visitStatus: "cancelada",
      previousVisitStatus: normalizedVisitStatus,
      surveyId: linkedSurveyId,
      surveyStatus: nextSurveyStatus,
    },
  });
}

export async function cancelSurveyVisit(visitId: string, surveyId?: string): Promise<void> {
  if (surveyId) {
    const { data: visitData, error: visitLoadError } = await supabase
      .from("technical_visits")
      .select("id, site_survey_id")
      .eq("id", visitId)
      .maybeSingle<{ id: string; site_survey_id: string | null }>();

    if (visitLoadError) {
      throw buildError(visitLoadError, "No se pudo validar la visita tecnica.");
    }
    if (!visitData?.site_survey_id || visitData.site_survey_id !== surveyId) {
      throw new Error("La visita tecnica no pertenece al levantamiento indicado.");
    }
  }

  await cancelTechnicalVisit(visitId);
}

export async function rescheduleTechnicalVisit(input: RescheduleTechnicalVisitInput): Promise<void> {
  const nextStart = parseDateToIso(input.scheduledStart, "inicio");
  const nextEnd = input.scheduledEnd ? parseDateToIso(input.scheduledEnd, "fin") : null;

  if (nextEnd && Date.parse(nextEnd) <= Date.parse(nextStart)) {
    throw new Error("La fecha fin debe ser mayor que la fecha inicio.");
  }

  const { data: visitData, error: visitLoadError } = await supabase
    .from("technical_visits")
    .select("id, company_id, site_survey_id, scheduled_start, scheduled_end, technician_id, status, ticket_id, installation_project_id")
    .eq("id", input.visitId)
    .maybeSingle<TechnicalVisitStatusGuardRow>();

  if (visitLoadError) {
    throw buildError(visitLoadError, "No se pudo validar la visita tecnica.");
  }
  if (!visitData) {
    throw new Error("La visita tecnica no existe.");
  }

  const normalizedVisitStatus = normalizeVisitStatus(visitData.status);
  if (normalizedVisitStatus === "completada") {
    throw new Error("No se puede reprogramar una visita completada.");
  }
  if (!canRescheduleVisitStatus(normalizedVisitStatus)) {
    throw new Error("Solo se pueden reprogramar visitas programadas o canceladas.");
  }

  const linkedSurveyId = safeNullableText(visitData.site_survey_id);
  if (linkedSurveyId) {
    const { data: surveyData, error: surveyLoadError } = await supabase
      .from("site_surveys")
      .select("id, status, completed_at")
      .eq("id", linkedSurveyId)
      .maybeSingle<SiteSurveyStatusGuardRow>();

    if (surveyLoadError) {
      throw buildError(surveyLoadError, "No se pudo validar el levantamiento asociado.");
    }

    if (surveyData) {
      if (isSurveyCompletedStatus(surveyData.status) || Boolean(surveyData.completed_at)) {
        throw new Error("No se puede reprogramar la visita: el levantamiento ya esta completado.");
      }
      if (normalizeSurveyStatus(surveyData.status) === "cancelado") {
        throw new Error("No se puede reprogramar la visita: el levantamiento esta cancelado.");
      }
    }
  }

  const payload: {
    scheduled_start: string;
    scheduled_end: string | null;
    technician_id?: string | null;
    status?: string;
  } = {
    scheduled_start: nextStart,
    scheduled_end: nextEnd,
  };

  if (input.technicianId !== undefined) {
    payload.technician_id = input.technicianId;
  }
  if (normalizedVisitStatus === "cancelada") {
    payload.status = "programada";
  }

  const { error: updateError } = await supabase
    .from("technical_visits")
    .update(payload)
    .eq("id", input.visitId);

  if (updateError) {
    throw buildError(updateError, "No se pudo reprogramar la visita tecnica.");
  }

  await logAuditEvent({
    action: "update",
    entity: "technical_visits",
    entityId: input.visitId,
    companyId: safeNullableText(visitData.company_id),
    newValues: {
      previousStatus: normalizedVisitStatus,
      nextStatus: payload.status ?? normalizedVisitStatus,
      previousStart: safeNullableText(visitData.scheduled_start),
      previousEnd: safeNullableText(visitData.scheduled_end),
      nextStart,
      nextEnd,
      previousTechnicianId: safeNullableText(visitData.technician_id),
      nextTechnicianId: payload.technician_id ?? safeNullableText(visitData.technician_id),
      surveyId: linkedSurveyId,
      ticketId: visitData.ticket_id ?? null,
      installationProjectId: safeNullableText(visitData.installation_project_id),
    },
  });
}

export async function cancelSiteSurvey(surveyId: string): Promise<void> {
  const { data: surveyData, error: surveyLoadError } = await supabase
    .from("site_surveys")
    .select("id, company_id, status, completed_at")
    .eq("id", surveyId)
    .maybeSingle<SiteSurveyStatusGuardRow>();

  if (surveyLoadError) {
    throw buildError(surveyLoadError, "No se pudo validar el levantamiento.");
  }
  if (!surveyData) {
    throw new Error("No se encontro el levantamiento tecnico.");
  }

  const normalizedSurveyStatus = normalizeSurveyStatus(surveyData.status);
  if (isSurveyCompletedStatus(surveyData.status) || Boolean(surveyData.completed_at)) {
    throw new Error("No se puede cancelar un levantamiento completado.");
  }
  if (!canCancelSurveyStatus(normalizedSurveyStatus)) {
    throw new Error("El levantamiento no puede cancelarse en su estado actual.");
  }

  const { error: updateSurveyError } = await supabase
    .from("site_surveys")
    .update({ status: "cancelado" })
    .eq("id", surveyId);

  if (updateSurveyError) {
    throw buildError(updateSurveyError, "No se pudo cancelar el levantamiento.");
  }

  const { data: surveyVisits, error: visitsLoadError } = await supabase
    .from("technical_visits")
    .select("id, status")
    .eq("site_survey_id", surveyId)
    .is("ticket_id", null)
    .is("installation_project_id", null)
    .returns<Array<{ id: string; status: string | null }>>();

  if (visitsLoadError) {
    throw buildError(visitsLoadError, "El levantamiento fue cancelado, pero no se pudieron validar las visitas asociadas.");
  }

  const visitIdsToCancel = (surveyVisits ?? [])
    .filter((visit) => {
      const status = normalizeVisitStatus(visit.status);
      return status !== "cancelada" && status !== "completada";
    })
    .map((visit) => visit.id);

  if (visitIdsToCancel.length > 0) {
    const { error: visitsCancelError } = await supabase
      .from("technical_visits")
      .update({ status: "cancelada" })
      .in("id", visitIdsToCancel);

    if (visitsCancelError) {
      throw buildError(visitsCancelError, "El levantamiento fue cancelado, pero no se pudieron cancelar sus visitas tecnicas.");
    }
  }

  await logAuditEvent({
    action: "cancel",
    entity: "site_surveys",
    entityId: surveyId,
    companyId: safeNullableText(surveyData.company_id),
    newValues: {
      previousStatus: normalizedSurveyStatus,
      status: "cancelado",
      canceledVisits: visitIdsToCancel.length,
    },
  });
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
    status: normalizeSurveyStatus(safeNullableText(surveyData.status)),
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
    .select("id, site_survey_id, scheduled_start, scheduled_end, technician_id, status, ticket_id, installation_project_id")
    .eq("site_survey_id", surveyId)
    .is("ticket_id", null)
    .is("installation_project_id", null)
    .order("scheduled_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw buildError(error, "No se pudo cargar la visita tecnica.");
  }

  if (!data) return null;

  return {
    id: safeText(data.id),
    siteSurveyId: safeText(data.site_survey_id),
    scheduledStart: safeText(data.scheduled_start),
    scheduledEnd: safeNullableText(data.scheduled_end),
    technicianId: safeNullableText(data.technician_id),
    status: normalizeVisitStatus(safeNullableText(data.status)) ?? "programada",
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
  if (templates.length === 0) return [];

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

  return options;
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

  await logAuditEvent({
    action: "create",
    entity: "site_survey_checklist_items",
    entityId: surveyId,
    newValues: {
      inserted: payload.length,
      templates: templates.map((template) => template.id),
    },
  });

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

  await logAuditEvent({
    action: "create",
    entity: "site_survey_checklist_items",
    entityId: data.id,
    newValues: {
      surveyId,
      text: data.text,
      itemOrder: data.item_order,
    },
  });

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

  await logAuditEvent({
    action: "update",
    entity: "site_survey_checklist_items",
    entityId: itemId,
    newValues: payload,
  });
}

export async function deleteSurveyChecklistItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from("site_survey_checklist_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    throw buildError(error, "No se pudo eliminar el item del checklist.");
  }

  await logAuditEvent({
    action: "delete",
    entity: "site_survey_checklist_items",
    entityId: itemId,
  });
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
  const statusPayload =
    patch.status === undefined ? undefined : normalizeSurveyStatus(patch.status);

  const { error } = await supabase
    .from("site_surveys")
    .update({
      requirements: patch.requirements,
      observations: patch.observations,
      recomendations: patch.recomendations,
      risks: patch.risks,
      status: statusPayload,
    })
    .eq("id", surveyId);

  if (error) {
    throw buildError(error, "No se pudo guardar el formulario del levantamiento.");
  }

  await logAuditEvent({
    action: "update",
    entity: "site_surveys",
    entityId: surveyId,
    newValues: {
      requirements: patch.requirements,
      observations: patch.observations,
      recomendations: patch.recomendations,
      risks: patch.risks,
      status: statusPayload,
    },
  });
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

  await logAuditEvent({
    action: "update",
    entity: "site_surveys",
    entityId: surveyId,
    newValues: {
      layoutDevices: layout.devices.length,
      layoutWalls: layout.walls.length,
      layoutZones: layout.zones.length,
    },
  });
}

export async function finalizeSurveyExecution(
  surveyId: string,
  visitId: string | null
): Promise<void> {
  const { data: surveyData, error: surveyLoadError } = await supabase
    .from("site_surveys")
    .select("id, status, completed_at")
    .eq("id", surveyId)
    .maybeSingle<SiteSurveyStatusGuardRow>();

  if (surveyLoadError) {
    throw buildError(surveyLoadError, "No se pudo validar el levantamiento.");
  }
  if (!surveyData) {
    throw new Error("No se encontro el levantamiento tecnico.");
  }
  if (isSurveyCompletedStatus(surveyData.status) || Boolean(surveyData.completed_at)) {
    throw new Error("El levantamiento ya fue finalizado.");
  }
  if (normalizeSurveyStatus(surveyData.status) === "cancelado") {
    throw new Error("No se puede finalizar un levantamiento cancelado.");
  }

  let visitData: TechnicalVisitStatusGuardRow | null = null;
  if (visitId) {
    const { data: selectedVisit, error: selectedVisitError } = await supabase
      .from("technical_visits")
      .select("id, site_survey_id, status, ticket_id, installation_project_id")
      .eq("id", visitId)
      .maybeSingle<TechnicalVisitStatusGuardRow>();

    if (selectedVisitError) {
      throw buildError(selectedVisitError, "No se pudo validar la visita tecnica.");
    }
    visitData = selectedVisit;
  } else {
    const { data: fallbackVisit, error: fallbackVisitError } = await supabase
      .from("technical_visits")
      .select("id, site_survey_id, status, ticket_id, installation_project_id")
      .eq("site_survey_id", surveyId)
      .is("ticket_id", null)
      .is("installation_project_id", null)
      .order("scheduled_start", { ascending: false })
      .limit(1)
      .maybeSingle<TechnicalVisitStatusGuardRow>();

    if (fallbackVisitError) {
      throw buildError(fallbackVisitError, "No se pudo validar la visita tecnica.");
    }
    visitData = fallbackVisit;
  }

  if (!visitData) {
    throw new Error("No se encontro la visita tecnica vinculada al levantamiento.");
  }

  if (safeNullableText(visitData.site_survey_id) !== surveyId) {
    throw new Error("La visita tecnica no pertenece al levantamiento.");
  }
  if (visitData.ticket_id !== null || safeNullableText(visitData.installation_project_id)) {
    throw new Error("Solo se puede finalizar la visita tecnica del levantamiento.");
  }

  const normalizedVisitStatus = normalizeVisitStatus(visitData.status);
  if (normalizedVisitStatus === "cancelada") {
    throw new Error("No se puede finalizar un levantamiento con una visita cancelada.");
  }
  if (normalizedVisitStatus !== "en_progreso" && normalizedVisitStatus !== "completada") {
    throw new Error("Primero debes iniciar la visita tecnica para finalizar el levantamiento.");
  }

  const { error: surveyError } = await supabase
    .from("site_surveys")
    .update({
      status: "completado",
      completed_at: new Date().toISOString(),
    })
    .eq("id", surveyId);

  if (surveyError) {
    throw buildError(surveyError, "No se pudo finalizar el levantamiento.");
  }

  const { error: visitError } = await supabase
    .from("technical_visits")
    .update({ status: "completada" })
    .eq("id", visitData.id);

  if (visitError) {
    throw buildError(visitError, "No se pudo actualizar el estado de la visita tecnica.");
  }

  await logAuditEvent({
    action: "complete",
    entity: "site_surveys",
    entityId: surveyId,
    newValues: {
      status: "completado",
      visitId: visitData.id,
      visitStatus: "completada",
      previousVisitStatus: normalizedVisitStatus,
    },
  });
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

  await logAuditEvent({
    action: "upload",
    entity: "survey_media",
    entityId: input.surveyId,
    companyId: input.companyId,
    newValues: {
      files: input.files.length,
      category: input.category,
      zoneId: input.zoneId,
    },
  });
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

  await logAuditEvent({
    action: "update",
    entity: "survey_media",
    entityId: mediaId,
    newValues: payload,
  });
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

  await logAuditEvent({
    action: "delete",
    entity: "survey_media",
    entityId: mediaId,
    newValues: {
      filePath,
    },
  });
}
