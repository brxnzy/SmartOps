import { supabase } from "../libs/supabase";
import type {
  CreateTicketCommentInput,
  CreateTicketInput,
  CreateTicketVisitInput,
  Ticket,
  TicketAttachment,
  TicketComment,
  TicketListItem,
  TicketSla,
  TicketStatus,
  TicketVisit,
} from "../types/ticketing.types";

const TICKET_ATTACHMENT_BUCKET = "ticket-attachments";
const SLA_HOURS: Record<TicketSla, number> = {
  urgente: 4,
  "24h": 24,
  "48h": 48,
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

function mapVisit(row: Record<string, unknown>): TicketVisit {
  return {
    id: safeText(row.id),
    ticketId: safeText(row.ticket_id),
    technicianId: safeNullableText(row.technician_id),
    technicianName:
      typeof row.technician === "object" && row.technician
        ? safeNullableText((row.technician as { name?: unknown }).name)
        : safeNullableText(row.technician_name),
    scheduledAt: safeText(row.scheduled_at, new Date().toISOString()),
    diagnosis: safeNullableText(row.diagnosis),
    resolution: safeNullableText(row.resolution),
    createdAt: safeText(row.created_at, new Date().toISOString()),
    completedAt: safeDate(row.completed_at),
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
      "id, code, company_id, customer_id, site_id, zone_id, category_id, status, description, sla_type, sla_due_at, assigned_to, created_at, updated_at, category:ticket_categories ( id, name )"
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
      "id, code, company_id, customer_id, site_id, zone_id, category_id, status, description, sla_type, sla_due_at, assigned_to, created_at, updated_at, category:ticket_categories ( id, name )"
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
  visits: TicketVisit[];
}> {
  const [{ data: ticketData, error: ticketError }, commentsResponse, attachmentsResponse, visitsResponse] =
    await Promise.all([
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
      supabase
        .from("ticket_visits")
        .select("id, ticket_id, technician_id, scheduled_at, diagnosis, resolution, created_at, completed_at")
        .eq("ticket_id", ticketId)
        .order("scheduled_at", { ascending: true }),
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
  const visits = (visitsResponse.data ?? []).map((row) => mapVisit(row as Record<string, unknown>));

  return {
    ticket: mapTicket(ticketData as Record<string, unknown>),
    comments,
    attachments,
    visits,
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
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus): Promise<void> {
  const { error } = await supabase.from("tickets").update({ status }).eq("id", ticketId);
  if (error) throw new Error(error.message || "No se pudo actualizar el estado.");
}

export async function assignTicket(ticketId: string, technicianId: string | null): Promise<void> {
  const { error } = await supabase.from("tickets").update({ assigned_to: technicianId }).eq("id", ticketId);
  if (error) throw new Error(error.message || "No se pudo asignar el tecnico.");
}

export async function createTicketVisit(
  companyId: string,
  ticketId: string,
  input: CreateTicketVisitInput
): Promise<void> {
  const { error } = await supabase.from("ticket_visits").insert({
    company_id: companyId,
    ticket_id: ticketId,
    technician_id: input.technicianId,
    scheduled_at: input.scheduledAt,
    diagnosis: input.diagnosis ?? null,
    resolution: input.resolution ?? null,
  });

  if (error) throw new Error(error.message || "No se pudo programar la visita.");
}

export async function completeTicketVisit(
  visitId: string,
  payload: { diagnosis: string; resolution: string }
): Promise<void> {
  const { error } = await supabase
    .from("ticket_visits")
    .update({
      diagnosis: payload.diagnosis,
      resolution: payload.resolution,
      completed_at: new Date().toISOString(),
    })
    .eq("id", visitId);

  if (error) throw new Error(error.message || "No se pudo cerrar la visita.");
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

export async function listTicketVisits(companyId: string): Promise<TicketVisit[]> {
  const { data, error } = await supabase
    .from("ticket_visits")
    .select("id, ticket_id, technician_id, scheduled_at, diagnosis, resolution, created_at, completed_at")
    .eq("company_id", companyId)
    .order("scheduled_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "No se pudieron cargar las visitas.");
  }

  return (data ?? []).map((row) => mapVisit(row as Record<string, unknown>));
}
