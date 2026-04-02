import { supabase } from "../libs/supabase";
import { logAuditEvent } from "./audit.service";
import { sendEmailNotification } from "./email-notification.service";
import { normalizeVisitStatus } from "../utils/siteSurveyWorkflow";
import type {
  CreateTicketCommentInput,
  CreateTicketInput,
  CreateTechnicalVisitInput,
  Ticket,
  TicketAttachment,
  TicketComment,
  TicketListItem,
  TicketSla,
  TicketStatus,
  TechnicalVisitSummary,
} from "../types/ticketing.types";

const TICKET_ATTACHMENT_BUCKET = "ticket-attachments";
const SLA_HOURS: Record<TicketSla, number> = {
  urgente: 4,
  "24h": 24,
  "48h": 48,
};

type TicketDbContext = {
  id: string;
  code: string;
  status: TicketStatus;
  customer_id: string;
  site_id: string | null;
};

function safeText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safeNullableText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value ? value : null;
}

function computeSlaDueAt(slaType: TicketSla): string {
  const base = new Date();
  const hours = SLA_HOURS[slaType] ?? 24;
  base.setHours(base.getHours() + hours);
  return base.toISOString();
}

function isValidEmail(value: string | null | undefined): value is string {
  if (!value) return false;
  const normalized = value.trim();
  return normalized.length > 3 && normalized.includes("@");
}

function formatDateTimeForEmail(value: string | null): string {
  if (!value) return "Sin fecha definida";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "Sin fecha definida";
  return new Intl.DateTimeFormat("es-DO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(parsed));
}

function getTicketUrl(ticketId: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/customer/tickets/${ticketId}`;
}

async function getCustomerEmailData(
  customerId: string
): Promise<{ email: string | null; name: string | null }> {
  const { data } = await supabase
    .from("users")
    .select("email, name")
    .eq("id", customerId)
    .maybeSingle<{ email: string | null; name: string | null }>();

  return {
    email: data?.email ?? null,
    name: data?.name ?? null,
  };
}

async function getTicketDbContext(companyId: string, ticketId: string): Promise<TicketDbContext | null> {
  const { data, error } = await supabase
    .from("tickets")
    .select("id, code, status, customer_id, site_id")
    .eq("company_id", companyId)
    .eq("id", ticketId)
    .maybeSingle<TicketDbContext>();

  if (error || !data) return null;
  return data;
}

async function getSiteName(siteId: string | null): Promise<string | null> {
  if (!siteId) return null;
  const { data } = await supabase
    .from("customer_sites")
    .select("name")
    .eq("id", siteId)
    .maybeSingle<{ name: string | null }>();
  return data?.name ?? null;
}

function mapTicket(row: Record<string, unknown>): TicketListItem {
  return {
    id: safeText(row.id),
    code: safeText(row.code, "TK-????"),
    companyId: safeText(row.company_id),
    customerId: safeText(row.customer_id),
    siteId: safeNullableText(row.site_id),
    zoneId: safeNullableText(row.zone_id),
    categoryId: safeText(row.category_id),
    status: (safeText(row.status, "abierto") as TicketListItem["status"]),
    description: safeText(row.description, ""),
    slaType: (safeText(row.sla_type, "24h") as TicketListItem["slaType"]),
    slaDueAt: safeDate(row.sla_due_at),
    assignedTo: safeNullableText(row.assigned_to),
    createdAt: safeText(row.created_at, new Date().toISOString()),
    updatedAt: safeDate(row.updated_at),
    categoryName:
      typeof row.category === "object" && row.category
        ? safeNullableText((row.category as { name?: unknown }).name)
        : safeNullableText(row.category_name),
    customerName:
      typeof row.customer === "object" && row.customer
        ? safeNullableText((row.customer as { name?: unknown }).name)
        : null,
    technicianName:
      typeof row.technician === "object" && row.technician
        ? safeNullableText((row.technician as { name?: unknown }).name)
        : null,
    siteName:
      typeof row.site === "object" && row.site
        ? safeNullableText((row.site as { name?: unknown }).name)
        : null,
  };
}

function mapComment(row: Record<string, unknown>): TicketComment {
  return {
    id: safeText(row.id),
    ticketId: safeText(row.ticket_id),
    authorId: safeText(row.author_id),
    authorName:
      typeof row.author === "object" && row.author
        ? safeNullableText((row.author as { name?: unknown }).name)
        : safeNullableText(row.author_name),
    body: safeText(row.body, ""),
    isInternal: Boolean(row.is_internal),
    createdAt: safeText(row.created_at, new Date().toISOString()),
  };
}

function mapAttachment(row: Record<string, unknown>): TicketAttachment {
  return {
    id: safeText(row.id),
    ticketId: safeText(row.ticket_id),
    commentId: safeNullableText(row.comment_id),
    fileName: safeText(row.file_name, "archivo"),
    filePath: safeText(row.file_path, ""),
    fileType: safeNullableText(row.file_type),
    uploadedBy: safeNullableText(row.uploaded_by),
    createdAt: safeText(row.created_at, new Date().toISOString()),
  };
}

function mapTechnicalVisit(row: Record<string, unknown>): TechnicalVisitSummary {
  const ticket =
    typeof row.ticket === "object" && row.ticket
      ? (row.ticket as { id?: unknown; code?: unknown; site?: { name?: unknown } | null })
      : null;
  const technician =
    typeof row.technician === "object" && row.technician
      ? (row.technician as { id?: unknown; name?: unknown })
      : null;

  return {
    id: safeText(row.id),
    ticketId: safeNullableText(row.ticket_id),
    ticketCode: safeNullableText(ticket?.code),
    siteName: safeNullableText(ticket?.site?.name),
    scheduledStart: safeNullableText(row.scheduled_start),
    scheduledEnd: safeNullableText(row.scheduled_end),
    technicianId: safeNullableText(row.technician_id),
    technicianName: safeNullableText(technician?.name),
    status: safeNullableText(row.status),
  };
}

async function resolveAttachmentUrls(attachments: TicketAttachment[]): Promise<TicketAttachment[]> {
  return Promise.all(
    attachments.map(async (attachment) => {
      if (!attachment.filePath) return attachment;

      const { data, error } = await supabase.storage
        .from(TICKET_ATTACHMENT_BUCKET)
        .createSignedUrl(attachment.filePath, 60 * 60);

      if (!error && data?.signedUrl) {
        return { ...attachment, url: data.signedUrl };
      }

      const { data: publicData } = supabase.storage
        .from(TICKET_ATTACHMENT_BUCKET)
        .getPublicUrl(attachment.filePath);

      return { ...attachment, url: publicData.publicUrl };
    })
  );
}

export async function listCompanyTickets(companyId: string): Promise<TicketListItem[]> {
  const { data, error } = await supabase
    .from("tickets")
    .select(
      "id, code, company_id, customer_id, site_id, zone_id, category_id, status, description, sla_type, sla_due_at, assigned_to, created_at, updated_at, category:ticket_categories ( id, name ), site:customer_sites ( id, name )"
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "No se pudieron cargar los tickets.");
  }

  return (data ?? []).map((row) => mapTicket(row as Record<string, unknown>));
}

export async function listCustomerTickets(
  companyId: string,
  customerId: string
): Promise<TicketListItem[]> {
  const { data, error } = await supabase
    .from("tickets")
    .select(
      "id, code, company_id, customer_id, site_id, zone_id, category_id, status, description, sla_type, sla_due_at, assigned_to, created_at, updated_at, category:ticket_categories ( id, name ), site:customer_sites ( id, name )"
    )
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "No se pudieron cargar tus tickets.");
  }

  return (data ?? []).map((row) => mapTicket(row as Record<string, unknown>));
}

export async function getTicketDetail(
  companyId: string,
  ticketId: string
): Promise<{
  ticket: Ticket;
  comments: TicketComment[];
  attachments: TicketAttachment[];
}> {
  const [{ data: ticketData, error: ticketError }, commentsResponse, attachmentsResponse] = await Promise.all([
    supabase
      .from("tickets")
      .select("*, category:ticket_categories ( id, name )")
      .eq("company_id", companyId)
      .eq("id", ticketId)
      .single(),
    supabase
      .from("ticket_comments")
      .select("id, ticket_id, author_id, body, is_internal, created_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true }),
    supabase
      .from("ticket_attachments")
      .select("id, ticket_id, comment_id, file_name, file_path, file_type, uploaded_by, created_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true }),
  ]);

  if (ticketError || !ticketData) {
    throw new Error(ticketError?.message || "No se pudo cargar el ticket.");
  }

  const comments = (commentsResponse.data ?? []).map((row) =>
    mapComment(row as Record<string, unknown>)
  );
  const attachments = await resolveAttachmentUrls(
    (attachmentsResponse.data ?? []).map((row) => mapAttachment(row as Record<string, unknown>))
  );

  return {
    ticket: mapTicket(ticketData as Record<string, unknown>),
    comments,
    attachments,
  };
}

export async function createTicket(
  companyId: string,
  customerId: string,
  input: CreateTicketInput,
  files: File[]
): Promise<Ticket> {
  const code = `TK-${crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`;
  const slaDueAt = computeSlaDueAt(input.slaType);

  const { data, error } = await supabase
    .from("tickets")
    .insert({
      company_id: companyId,
      customer_id: customerId,
      site_id: input.siteId,
      zone_id: input.zoneId,
      category_id: input.categoryId,
      status: "abierto",
      description: input.description,
      sla_type: input.slaType,
      sla_due_at: slaDueAt,
      code,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "No se pudo crear el ticket.");
  }

  if (files.length > 0) {
    await uploadTicketAttachments(companyId, data.id as string, customerId, files, null);
  }

  await logAuditEvent({
    action: "create",
    entity: "tickets",
    entityId: data.id as string,
    companyId,
    userId: customerId,
    newValues: {
      code,
      status: "abierto",
      categoryId: input.categoryId,
      slaType: input.slaType,
      siteId: input.siteId ?? null,
      attachments: files.length,
    },
  });

  const customer = await getCustomerEmailData(customerId);
  if (isValidEmail(customer.email)) {
    void sendEmailNotification({
      companyId,
      to: customer.email,
      type: "transaction",
      eventKey: "ticket.created",
      templateKey: "ticket_created",
      entityType: "ticket",
      entityId: String(data.id),
      title: `Ticket ${code} creado`,
      message: `Hola ${customer.name ?? "cliente"}, recibimos tu ticket ${code}. Nuestro equipo lo revisara pronto.`,
      actionUrl: getTicketUrl(String(data.id)),
      metadata: {
        ticketCode: code,
        estado: "abierto",
        sla: input.slaType,
      },
    }).catch((notifyError) => {
      console.error("[tickets.service] ticket_created_email_error", notifyError);
    });
  }

  return mapTicket(data as Record<string, unknown>);
}

export async function uploadTicketAttachments(
  companyId: string,
  ticketId: string,
  uploadedBy: string,
  files: File[],
  commentId: string | null
): Promise<void> {
  if (files.length === 0) return;

  for (const file of files) {
    const fileName = safeText(file.name, "evidencia");
    const sanitized = fileName.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const filePath = `${companyId}/${ticketId}/${crypto.randomUUID()}-${sanitized}`;

    const { error: uploadError } = await supabase.storage
      .from(TICKET_ATTACHMENT_BUCKET)
      .upload(filePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message || "No se pudo subir el adjunto.");
    }

    const { error: insertError } = await supabase.from("ticket_attachments").insert({
      company_id: companyId,
      ticket_id: ticketId,
      comment_id: commentId,
      file_name: fileName,
      file_path: filePath,
      file_type: file.type || null,
      uploaded_by: uploadedBy,
    });

    if (insertError) {
      await supabase.storage.from(TICKET_ATTACHMENT_BUCKET).remove([filePath]);
      throw new Error(insertError.message || "No se pudo registrar el adjunto.");
    }
  }
}

export async function addTicketComment(
  companyId: string,
  ticketId: string,
  authorId: string,
  input: CreateTicketCommentInput,
  files: File[]
): Promise<void> {
  const { data, error } = await supabase
    .from("ticket_comments")
    .insert({
      company_id: companyId,
      ticket_id: ticketId,
      author_id: authorId,
      body: input.body,
      is_internal: input.isInternal,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "No se pudo guardar el comentario.");
  }

  if (files.length > 0) {
    await uploadTicketAttachments(companyId, ticketId, authorId, files, data.id as string);
  }

  await logAuditEvent({
    action: "create",
    entity: "ticket_comments",
    entityId: data.id as string,
    companyId,
    userId: authorId,
    newValues: {
      ticketId,
      isInternal: input.isInternal,
      attachments: files.length,
    },
  });

  if (input.isInternal) return;

  const ticketContext = await getTicketDbContext(companyId, ticketId);
  if (!ticketContext) return;

  const customer = await getCustomerEmailData(ticketContext.customer_id);
  if (!isValidEmail(customer.email)) return;

  const isResolved = ticketContext.status === "resuelto" || ticketContext.status === "cerrado";
  const title = isResolved
    ? `Ticket ${ticketContext.code} resuelto`
    : `Ticket ${ticketContext.code} actualizado`;
  const message = isResolved
    ? `Hola ${customer.name ?? "cliente"}, tu ticket ${ticketContext.code} fue marcado como ${ticketContext.status}.`
    : `Hola ${customer.name ?? "cliente"}, hay una actualizacion en tu ticket ${ticketContext.code}.`;

  void sendEmailNotification({
    companyId,
    to: customer.email,
    type: "transaction",
    eventKey: "ticket.updated",
    templateKey: "ticket_updated",
    entityType: "ticket",
    entityId: ticketId,
    title,
    message,
    actionUrl: getTicketUrl(ticketId),
    metadata: {
      ticketCode: ticketContext.code,
      estado: ticketContext.status,
    },
  }).catch((notifyError) => {
    console.error("[tickets.service] ticket_updated_email_error", notifyError);
  });
}

export async function listTechnicians(companyId: string): Promise<Array<{ id: string; name: string }>> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("users:user_id ( id, name ), roles:role_id ( name )")
    .eq("company_id", companyId);

  if (error) {
    throw new Error(error.message || "No se pudieron cargar los tecnicos.");
  }

  const mapped =
    (data ?? [])
      .map((row) => {
        const user = (row as { users?: { id?: string; name?: string } | null }).users ?? null;
        const role = (row as { roles?: { name?: string } | null }).roles ?? null;
        if (!user?.id || !user.name) return null;
        const roleName = role?.name?.toLowerCase() ?? "";
        if (!["tecnico", "técnico", "technician", "admin"].some((key) => roleName.includes(key))) {
          return null;
        }
        return { id: user.id, name: user.name };
      })
      .filter((item): item is { id: string; name: string } => Boolean(item)) ?? [];

  return mapped;
}

export async function createTicketTechnicalVisit(
  companyId: string,
  ticketId: string,
  input: CreateTechnicalVisitInput
): Promise<void> {
  const normalizedVisitStatusRaw = normalizeVisitStatus(input.status);
  const visitStatus =
    normalizedVisitStatusRaw === "programada" ||
    normalizedVisitStatusRaw === "en_progreso" ||
    normalizedVisitStatusRaw === "completada" ||
    normalizedVisitStatusRaw === "cancelada"
      ? normalizedVisitStatusRaw
      : "programada";

  const { data: technicalVisit, error } = await supabase
    .from("technical_visits")
    .insert({
      company_id: companyId,
      ticket_id: ticketId,
      technician_id: input.technicianId,
      scheduled_start: input.scheduledStart,
      scheduled_end: input.scheduledEnd,
      status: visitStatus,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !technicalVisit?.id) {
    throw new Error(error?.message || "No se pudo programar la visita tecnica.");
  }

  const technicalVisitId = technicalVisit.id;

  await logAuditEvent({
    action: "create",
    entity: "technical_visits",
    entityId: technicalVisitId,
    companyId,
    newValues: {
      technicalVisitId,
      ticketId,
      technicianId: input.technicianId,
      scheduledStart: input.scheduledStart,
      scheduledEnd: input.scheduledEnd,
      status: visitStatus,
    },
  });

  const ticketContext = await getTicketDbContext(companyId, ticketId);
  if (!ticketContext) return;

  const customer = await getCustomerEmailData(ticketContext.customer_id);
  if (!isValidEmail(customer.email)) return;

  const visitStatusLower = String(visitStatus).trim().toLowerCase();
  const isConfirmed =
    visitStatusLower.includes("confirm") || visitStatusLower.includes("confirmad");
  const siteName = await getSiteName(ticketContext.site_id);

  void sendEmailNotification({
    companyId,
    to: customer.email,
    type: "transaction",
    eventKey: isConfirmed ? "visit.confirmed" : "visit.scheduled",
    templateKey: isConfirmed ? "visit_confirmed" : "visit_scheduled",
    entityType: "technical_visit",
    entityId: technicalVisitId,
    title: isConfirmed ? "Visita tecnica confirmada" : "Visita tecnica programada",
    message: isConfirmed
      ? `Hola ${customer.name ?? "cliente"}, confirmamos la visita tecnica del ticket ${
          ticketContext.code
        } para ${formatDateTimeForEmail(input.scheduledStart)}.`
      : `Hola ${customer.name ?? "cliente"}, programamos una visita tecnica para el ticket ${
          ticketContext.code
        } el ${formatDateTimeForEmail(input.scheduledStart)}.`,
    actionUrl: getTicketUrl(ticketId),
      metadata: {
        ticketCode: ticketContext.code,
        sitio: siteName ?? "No definido",
        inicio: input.scheduledStart ?? null,
        fin: input.scheduledEnd ?? null,
        estadoVisita: visitStatus,
      },
  }).catch((notifyError) => {
    console.error("[tickets.service] visit_email_error", notifyError);
  });
}

export async function updateTicketStatus(
  companyId: string,
  ticketId: string,
  status: TicketStatus
): Promise<TicketListItem> {
  const { data, error } = await supabase
    .from("tickets")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("id", ticketId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "No se pudo actualizar el estado del ticket.");
  }

  await logAuditEvent({
    action: "update",
    entity: "tickets",
    entityId: ticketId,
    companyId,
    newValues: {
      status,
    },
  });

  const mapped = mapTicket(data as Record<string, unknown>);
  const customer = await getCustomerEmailData(mapped.customerId);
  if (isValidEmail(customer.email)) {
    const isResolved = status === "resuelto" || status === "cerrado";
    void sendEmailNotification({
      companyId,
      to: customer.email,
      type: "transaction",
      eventKey: isResolved ? "ticket.resolved" : "ticket.updated",
      templateKey: isResolved ? "ticket_resolved" : "ticket_status_updated",
      entityType: "ticket",
      entityId: mapped.id,
      title: isResolved ? `Ticket ${mapped.code} resuelto` : `Ticket ${mapped.code} actualizado`,
      message: isResolved
        ? `Hola ${customer.name ?? "cliente"}, tu ticket ${mapped.code} fue marcado como ${status}.`
        : `Hola ${customer.name ?? "cliente"}, tu ticket ${mapped.code} ahora esta en estado ${status}.`,
      actionUrl: getTicketUrl(mapped.id),
      metadata: {
        ticketCode: mapped.code,
        estado: status,
      },
    }).catch((notifyError) => {
      console.error("[tickets.service] ticket_status_email_error", notifyError);
    });
  }

  return mapped;
}

export async function listTicketTechnicalVisits(companyId: string): Promise<TechnicalVisitSummary[]> {
  const { data, error } = await supabase
    .from("technical_visits")
    .select(
      "id, scheduled_start, scheduled_end, technician_id, status, ticket_id, ticket:tickets ( id, code, site:customer_sites ( name ) ), technician:users ( id, name )"
    )
    .eq("company_id", companyId)
    .not("ticket_id", "is", null)
    .order("scheduled_start", { ascending: false });

  if (error) {
    throw new Error(error.message || "No se pudieron cargar las visitas tecnicas.");
  }

  return (data ?? []).map((row) => mapTechnicalVisit(row as Record<string, unknown>));
}
