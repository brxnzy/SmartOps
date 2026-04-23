import { supabase } from "../libs/supabase";
import { sendEmailNotification } from "./email-notification.service";
import type {
  ActiveSupportImpersonation,
  SuperadminSupportRequestRow,
  SupportMessage,
  SupportMessageAuthorKind,
  SupportRequest,
  SupportRequestPriority,
  SupportRequestStatus,
  SupportRequestType,
} from "../types/support.types";

type SupportRequestRow = {
  id: string;
  company_id: string;
  created_by: string;
  type: SupportRequestType;
  priority: SupportRequestPriority;
  status: SupportRequestStatus;
  title: string;
  description: string;
  assigned_superadmin: string | null;
  last_activity_at: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

type SupportMessageRow = {
  id: string;
  request_id: string;
  company_id: string;
  author_id: string;
  author_kind: SupportMessageAuthorKind;
  body: string;
  is_internal: boolean;
  created_at: string;
  author?: { name?: string | null } | null;
};

function mapSupportRequest(row: SupportRequestRow): SupportRequest {
  return {
    id: row.id,
    companyId: row.company_id,
    createdBy: row.created_by,
    type: row.type,
    priority: row.priority,
    status: row.status,
    title: row.title,
    description: row.description,
    assignedSuperadmin: row.assigned_superadmin,
    lastActivityAt: row.last_activity_at,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSupportMessage(row: SupportMessageRow): SupportMessage {
  return {
    id: row.id,
    requestId: row.request_id,
    companyId: row.company_id,
    authorId: row.author_id,
    authorKind: row.author_kind,
    body: row.body,
    isInternal: Boolean(row.is_internal),
    createdAt: row.created_at,
    authorName: row.author?.name ?? null,
  };
}

async function listSuperadminEmails(companyId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc("list_superadmin_emails", { p_company_id: companyId });
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return rows
    .map((row) => String((row as { email?: unknown }).email ?? "").trim())
    .filter((email) => email.length > 3 && email.includes("@"));
}

async function listCompanyAdminEmails(companyId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc("list_company_admin_emails", { p_company_id: companyId });
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return rows
    .map((row) => String((row as { email?: unknown }).email ?? "").trim())
    .filter((email) => email.length > 3 && email.includes("@"));
}

export async function createSupportRequest(input: {
  companyId: string;
  createdBy: string;
  type: SupportRequestType;
  title: string;
  description: string;
  priority: SupportRequestPriority;
}): Promise<SupportRequest> {
  const { data, error } = await supabase
    .from("support_requests")
    .insert({
      company_id: input.companyId,
      created_by: input.createdBy,
      type: input.type,
      title: input.title,
      description: input.description,
      priority: input.priority,
      status: "open",
    })
    .select("*")
    .single<SupportRequestRow>();

  if (error || !data) {
    throw new Error(error?.message || "No se pudo crear la solicitud de soporte.");
  }

  const created = mapSupportRequest(data);

  // Email notification (best-effort)
  void (async () => {
    try {
      const to = await listSuperadminEmails(created.companyId);
      if (to.length === 0) return;
      await sendEmailNotification({
        companyId: created.companyId,
        to,
        type: "transaction",
        eventKey: "support.request.created",
        templateKey: "support_request_created",
        entityType: "support_request",
        entityId: created.id,
        title: `Nueva solicitud: ${created.title}`,
        message: `Se creó una solicitud de soporte (${created.type}, prioridad ${created.priority}).`,
        metadata: {
          requestId: created.id,
          status: created.status,
          priority: created.priority,
          type: created.type,
        },
      });
    } catch (notifyError) {
      console.error("[support] request_created_email_error", notifyError);
    }
  })();

  return created;
}

export async function listCompanySupportRequests(companyId: string): Promise<SupportRequest[]> {
  const { data, error } = await supabase
    .from("support_requests")
    .select("*")
    .eq("company_id", companyId)
    .order("last_activity_at", { ascending: false })
    .returns<SupportRequestRow[]>();

  if (error) {
    throw new Error(error.message || "No se pudieron cargar las solicitudes de soporte.");
  }

  return (data ?? []).map(mapSupportRequest);
}

export async function getSupportRequest(companyId: string, requestId: string): Promise<SupportRequest> {
  const { data, error } = await supabase
    .from("support_requests")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", requestId)
    .single<SupportRequestRow>();

  if (error || !data) {
    throw new Error(error?.message || "No se pudo cargar la solicitud de soporte.");
  }

  return mapSupportRequest(data);
}

export async function listSupportMessages(companyId: string, requestId: string): Promise<SupportMessage[]> {
  const { data, error } = await supabase
    .from("support_messages")
    .select("*, author:users ( name )")
    .eq("company_id", companyId)
    .eq("request_id", requestId)
    .order("created_at", { ascending: true })
    .returns<SupportMessageRow[]>();

  if (error) {
    throw new Error(error.message || "No se pudieron cargar los mensajes.");
  }

  return (data ?? []).map(mapSupportMessage);
}

export async function addSupportMessage(input: {
  companyId: string;
  requestId: string;
  authorId: string;
  authorKind: SupportMessageAuthorKind;
  body: string;
  isInternal?: boolean;
}): Promise<SupportMessage> {
  const { data, error } = await supabase
    .from("support_messages")
    .insert({
      company_id: input.companyId,
      request_id: input.requestId,
      author_id: input.authorId,
      author_kind: input.authorKind,
      body: input.body,
      is_internal: Boolean(input.isInternal),
    })
    .select("*, author:users ( name )")
    .single<SupportMessageRow>();

  if (error || !data) {
    throw new Error(error?.message || "No se pudo enviar el mensaje.");
  }

  const created = mapSupportMessage(data);

  // Email notification (best-effort)
  void (async () => {
    try {
      const to =
        input.authorKind === "admin"
          ? await listSuperadminEmails(input.companyId)
          : await listCompanyAdminEmails(input.companyId);
      if (to.length === 0) return;
      await sendEmailNotification({
        companyId: input.companyId,
        to,
        type: "transaction",
        eventKey: "support.message.created",
        templateKey: "support_message_created",
        entityType: "support_message",
        entityId: created.id,
        title: "Nueva respuesta en soporte",
        message: "Tienes una nueva respuesta en una solicitud de soporte.",
        metadata: {
          requestId: input.requestId,
          authorKind: input.authorKind,
        },
      });
    } catch (notifyError) {
      console.error("[support] message_created_email_error", notifyError);
    }
  })();

  return created;
}

export async function superadminListSupportRequests(params: {
  status?: SupportRequestStatus | "all";
  priority?: SupportRequestPriority | "all";
  companyId?: string | "all";
  search?: string;
}): Promise<SuperadminSupportRequestRow[]> {
  const resolvedStatus = params.status && params.status !== "all" ? params.status : null;
  const resolvedPriority = params.priority && params.priority !== "all" ? params.priority : null;
  const resolvedCompanyId = params.companyId && params.companyId !== "all" ? params.companyId : null;
  const resolvedSearch = params.search?.trim() ? params.search.trim() : null;

  const { data, error } = await supabase.rpc("get_superadmin_support_requests", {
    p_status: resolvedStatus,
    p_priority: resolvedPriority,
    p_company_id: resolvedCompanyId,
    p_search: resolvedSearch,
  });

  if (error) {
    throw new Error(error.message || "No se pudo cargar la bandeja de soporte.");
  }

  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      id: String(item.id ?? ""),
      companyId: String(item.company_id ?? ""),
      companyName: String(item.company_name ?? ""),
      title: String(item.title ?? ""),
      type: (String(item.type ?? "help") as SupportRequestType),
      priority: (String(item.priority ?? "low") as SupportRequestPriority),
      status: (String(item.status ?? "open") as SupportRequestStatus),
      createdAt: String(item.created_at ?? new Date().toISOString()),
      lastActivityAt: String(item.last_activity_at ?? new Date().toISOString()),
    };
  });
}

export async function superadminSetSupportStatus(requestId: string, status: SupportRequestStatus): Promise<void> {
  const { error } = await supabase.rpc("set_support_request_status", {
    p_request_id: requestId,
    p_status: status,
  });

  if (error) {
    throw new Error(error.message || "No se pudo actualizar el estado.");
  }
}

export async function startSupportImpersonation(input: {
  companyId: string;
  userId: string;
  ttlMinutes?: number;
}): Promise<ActiveSupportImpersonation> {
  const { data, error } = await supabase.rpc("start_support_impersonation", {
    p_company_id: input.companyId,
    p_user_id: input.userId,
    p_ttl_minutes: input.ttlMinutes ?? 30,
  });

  if (error) {
    throw new Error(error.message || "No se pudo iniciar el modo soporte.");
  }

  const row = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : (data as Record<string, unknown> | null);
  return {
    id: String(row?.id ?? ""),
    companyId: String(row?.company_id ?? ""),
    impersonatedUserId: String(row?.impersonated_user_id ?? ""),
    expiresAt: String(row?.expires_at ?? new Date().toISOString()),
  };
}

export async function stopSupportImpersonation(): Promise<void> {
  const { error } = await supabase.rpc("stop_support_impersonation");
  if (error) {
    throw new Error(error.message || "No se pudo salir del modo soporte.");
  }
}

export async function getActiveSupportImpersonation(): Promise<ActiveSupportImpersonation | null> {
  const { data, error } = await supabase.rpc("get_active_support_impersonation");
  if (error) {
    throw new Error(error.message || "No se pudo cargar el modo soporte.");
  }

  const row = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : (data as Record<string, unknown> | null);
  const id = String(row?.id ?? "");
  if (!id) return null;
  return {
    id,
    companyId: String(row?.company_id ?? ""),
    impersonatedUserId: String(row?.impersonated_user_id ?? ""),
    expiresAt: String(row?.expires_at ?? new Date().toISOString()),
  };
}
