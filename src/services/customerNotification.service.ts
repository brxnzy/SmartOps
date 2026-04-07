import { supabase } from "../libs/supabase";
import type { SendEmailNotificationInput } from "../types/emailNotification";

export type CustomerNotification = {
  id: string;
  title: string;
  message: string;
  eventKey: string | null;
  templateKey: string | null;
  entityType: string | null;
  entityId: string | null;
  actionUrl: string | null;
  status: "pending" | "sent" | "failed";
  createdAt: string;
};

function safeText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function safeNullableText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return safeText(value, "") || null;
}

function asPayload(value: unknown): SendEmailNotificationInput | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as SendEmailNotificationInput;
  }
  return null;
}

export async function listCustomerNotifications(email: string): Promise<CustomerNotification[]> {
  const { data, error } = await supabase
    .from("email_dispatch_history")
    .select("id, event_key, template_key, entity_type, entity_id, status, subject, request_payload, created_at")
    .contains("to_emails", [email])
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message || "No se pudieron cargar las notificaciones.");
  }

  return (data ?? []).map((row) => {
    const payload = asPayload((row as Record<string, unknown>).request_payload);
    const title = safeText(payload?.title ?? (row as Record<string, unknown>).subject, "Notificacion");
    const message = safeText(payload?.message, "Tienes una nueva notificacion.");
    const actionUrl = safeNullableText(payload?.actionUrl);

    return {
      id: safeText((row as Record<string, unknown>).id),
      title,
      message,
      eventKey: safeNullableText((row as Record<string, unknown>).event_key),
      templateKey: safeNullableText((row as Record<string, unknown>).template_key),
      entityType: safeNullableText((row as Record<string, unknown>).entity_type),
      entityId: safeNullableText((row as Record<string, unknown>).entity_id),
      actionUrl,
      status: (safeText((row as Record<string, unknown>).status, "pending") as CustomerNotification["status"]) ?? "pending",
      createdAt: safeText((row as Record<string, unknown>).created_at, new Date().toISOString()),
    };
  });
}
