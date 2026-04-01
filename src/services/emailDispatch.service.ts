import { supabase } from "../libs/supabase";
import { sendEmailNotification } from "./email-notification.service";
import type { SendEmailNotificationInput } from "../types/emailNotification";

export interface EmailDispatchHistoryEntry {
  id: string;
  companyId: string | null;
  eventKey: string | null;
  templateKey: string | null;
  entityType: string | null;
  entityId: string | null;
  toEmails: string[];
  subject: string;
  status: "pending" | "sent" | "failed";
  provider: string;
  providerMessageId: string | null;
  attemptCount: number;
  retryOf: string | null;
  lastError: string | null;
  requestPayload: SendEmailNotificationInput | null;
  responsePayload: Record<string, unknown> | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
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

function safeArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => safeText(item)).filter(Boolean);
}

function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function mapRow(row: Record<string, unknown>): EmailDispatchHistoryEntry {
  return {
    id: safeText(row.id),
    companyId: safeNullableText(row.company_id),
    eventKey: safeNullableText(row.event_key),
    templateKey: safeNullableText(row.template_key),
    entityType: safeNullableText(row.entity_type),
    entityId: safeNullableText(row.entity_id),
    toEmails: safeArray(row.to_emails),
    subject: safeText(row.subject, "Sin asunto"),
    status: (safeText(row.status, "pending") as EmailDispatchHistoryEntry["status"]) ?? "pending",
    provider: safeText(row.provider, "smtp"),
    providerMessageId: safeNullableText(row.provider_message_id),
    attemptCount: safeNumber(row.attempt_count, 1),
    retryOf: safeNullableText(row.retry_of),
    lastError: safeNullableText(row.last_error),
    requestPayload: (row.request_payload as SendEmailNotificationInput | null) ?? null,
    responsePayload: (row.response_payload as Record<string, unknown> | null) ?? null,
    sentAt: safeNullableText(row.sent_at),
    createdAt: safeText(row.created_at, new Date().toISOString()),
    updatedAt: safeText(row.updated_at, new Date().toISOString()),
  };
}

export async function listEmailDispatchHistory(companyId: string): Promise<EmailDispatchHistoryEntry[]> {
  const { data, error } = await supabase
    .from("email_dispatch_history")
    .select(
      "id, company_id, event_key, template_key, entity_type, entity_id, to_emails, subject, status, provider, provider_message_id, attempt_count, retry_of, last_error, request_payload, response_payload, sent_at, created_at, updated_at"
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(error.message || "No se pudo cargar el historial de correos.");
  }

  return (data ?? []).map((row) => mapRow(asRecord(row)));
}

export async function retryEmailDispatch(entryId: string): Promise<void> {
  const { data, error } = await supabase
    .from("email_dispatch_history")
    .select("id, company_id, request_payload")
    .eq("id", entryId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "No se pudo cargar el correo para reintento.");
  }

  if (!data) {
    throw new Error("No se encontro el correo seleccionado.");
  }

  const payload = (data.request_payload ?? null) as SendEmailNotificationInput | null;
  if (!payload) {
    throw new Error("El registro no tiene payload para reintentar.");
  }

  const retryPayload: SendEmailNotificationInput = {
    ...payload,
    companyId: safeNullableText(data.company_id) ?? payload.companyId,
    retryOf: safeText(data.id),
  };

  await sendEmailNotification(retryPayload);
}
