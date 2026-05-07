import "@supabase/functions-js/edge-runtime.d.ts";
import nodemailer from "npm:nodemailer@6.9.15";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-service-role",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STEP_TIMEOUT_MS = 20_000;
const MAX_ATTACHMENTS = 5;
const MAX_SINGLE_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENTS_BYTES = 10 * 1024 * 1024;

type NotificationType = "event" | "transaction" | "custom";

type EmailAttachmentInput = {
  filename: string;
  contentBase64: string;
  contentType?: string;
};

type SendEmailPayload = {
  companyId?: string;
  to: string | string[];
  type?: NotificationType;
  eventKey?: string;
  templateKey?: string;
  entityType?: string;
  entityId?: string;
  retryOf?: string;
  subject?: string;
  title?: string;
  message?: string;
  html?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  attachments?: EmailAttachmentInput[];
};

type UserRoleRow = {
  user_id: string;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function withTimeout<T>(step: string, promise: Promise<T>, requestId: string, ms = STEP_TIMEOUT_MS): Promise<T> {
  const startedAt = Date.now();
  return Promise.race([
    promise.then((result) => {
      console.log(`[send_email_notification] request_id=${requestId} ok:${step} (${Date.now() - startedAt}ms)`);
      return result;
    }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Timeout:${step}`)), ms)),
  ]).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[send_email_notification] request_id=${requestId} fail:${step} -> ${message}`);
    throw error;
  });
}

function normalizeRecipients(input: string | string[]): string[] {
  const values = Array.isArray(input) ? input : [input];
  return Array.from(new Set(values.map((email) => email.trim()).filter(Boolean)));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildSubject(payload: SendEmailPayload): string {
  if (payload.subject?.trim()) return payload.subject.trim();

  if (payload.type === "transaction") {
    return `Transaccion registrada: ${payload.title?.trim() || "Actualizacion"}`;
  }

  if (payload.type === "event") {
    return `Notificacion de evento: ${payload.title?.trim() || "Actualizacion"}`;
  }

  return payload.title?.trim() || "Notificacion SmartOps";
}

function buildHtml(payload: SendEmailPayload): string {
  if (payload.html?.trim()) return payload.html;

  const type = payload.type ?? "custom";
  const title = payload.title?.trim() || "Notificacion";
  const message = payload.message?.trim() || "Se ha generado una nueva notificacion.";

  const metadataRows = payload.metadata
    ? Object.entries(payload.metadata)
        .map(([key, value]) => {
          const formattedValue =
            value === null || value === undefined ? "-" : typeof value === "string" ? value : JSON.stringify(value);
          return `<tr><td style="padding:6px 8px;border:1px solid #e2e8f0;color:#334155;font-weight:600;">${escapeHtml(
            key
          )}</td><td style="padding:6px 8px;border:1px solid #e2e8f0;color:#475569;">${escapeHtml(
            formattedValue
          )}</td></tr>`;
        })
        .join("")
    : "";

  const badgeColor = type === "transaction" ? "#0f766e" : type === "event" ? "#1d4ed8" : "#475569";

  return `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <div style="padding:16px 20px;background:#0f172a;color:#ffffff;">
          <div style="display:inline-block;background:${badgeColor};padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;text-transform:uppercase;">
            ${escapeHtml(type)}
          </div>
          <h2 style="margin:12px 0 0;font-size:20px;line-height:1.3;">${escapeHtml(title)}</h2>
        </div>
        <div style="padding:20px;">
          <p style="margin:0 0 12px;color:#334155;line-height:1.6;">${escapeHtml(message)}</p>
          ${
            payload.actionUrl
              ? `<p style="margin:0 0 14px;"><a href="${escapeHtml(
                  payload.actionUrl
                )}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:700;">Ver detalle</a></p>`
              : ""
          }
          ${
            metadataRows
              ? `<table style="border-collapse:collapse;width:100%;margin-top:10px;">${metadataRows}</table>`
              : ""
          }
        </div>
      </div>
    </div>
  `;
}

function estimateBase64Bytes(contentBase64: string): number {
  const sanitized = contentBase64.replace(/\s/g, "");
  if (!sanitized) return 0;
  const padding = sanitized.endsWith("==") ? 2 : sanitized.endsWith("=") ? 1 : 0;
  return Math.floor((sanitized.length * 3) / 4) - padding;
}

function normalizeAttachments(input: EmailAttachmentInput[] | undefined): Array<{
  filename: string;
  content: string;
  encoding: "base64";
  contentType?: string;
}> {
  if (!input?.length) return [];

  if (input.length > MAX_ATTACHMENTS) {
    throw new Error(`Se permiten maximo ${MAX_ATTACHMENTS} adjuntos por correo.`);
  }

  let totalBytes = 0;

  return input.map((attachment, index) => {
    const filename = attachment.filename?.trim();
    const contentBase64 = attachment.contentBase64?.trim();

    if (!filename) {
      throw new Error(`El adjunto #${index + 1} no tiene filename.`);
    }
    if (!contentBase64) {
      throw new Error(`El adjunto #${index + 1} no tiene contentBase64.`);
    }

    const estimatedBytes = estimateBase64Bytes(contentBase64);
    if (estimatedBytes <= 0) {
      throw new Error(`El adjunto #${index + 1} esta vacio.`);
    }
    if (estimatedBytes > MAX_SINGLE_ATTACHMENT_BYTES) {
      throw new Error(`El adjunto ${filename} supera el limite de 5 MB.`);
    }

    totalBytes += estimatedBytes;
    if (totalBytes > MAX_TOTAL_ATTACHMENTS_BYTES) {
      throw new Error("El tamano total de adjuntos supera 10 MB.");
    }

    return {
      filename,
      content: contentBase64,
      encoding: "base64" as const,
      contentType: attachment.contentType?.trim() || undefined,
    };
  });
}

function sanitizePayloadForLog(payload: Partial<SendEmailPayload> | null): Record<string, unknown> | null {
  if (!payload) return null;
  const attachments = payload.attachments?.map((attachment) => ({
    filename: attachment.filename,
    contentType: attachment.contentType ?? null,
    contentBytes: estimateBase64Bytes(attachment.contentBase64 ?? ""),
  })) ?? [];

  return {
    ...payload,
    attachments,
  };
}

async function insertEmailLog(input: {
  adminClient: ReturnType<typeof createClient>;
  companyId: string | null;
  payload: Partial<SendEmailPayload> | null;
  recipients: string[];
  subject: string;
  status: "sent" | "failed";
  providerMessageId?: string | null;
  lastError?: string | null;
  responsePayload?: Record<string, unknown> | null;
}) {
  const nowIso = new Date().toISOString();

  await input.adminClient
    .from("email_dispatch_history")
    .insert({
      company_id: input.companyId,
      event_key: input.payload?.eventKey ?? null,
      template_key: input.payload?.templateKey ?? null,
      entity_type: input.payload?.entityType ?? null,
      entity_id: input.payload?.entityId ?? null,
      to_emails: input.recipients,
      subject: input.subject,
      status: input.status,
      provider: "smtp",
      provider_message_id: input.providerMessageId ?? null,
      attempt_count: 1,
      retry_of: input.payload?.retryOf ?? null,
      last_error: input.lastError ?? null,
      request_payload: sanitizePayloadForLog(input.payload),
      response_payload: input.responsePayload ?? null,
      sent_at: input.status === "sent" ? nowIso : null,
      updated_at: nowIso,
    })
    .then(() => undefined)
    .catch((error) => {
      console.error(`[send_email_notification] email_log_insert_failed -> ${(error as Error)?.message ?? String(error)}`);
    });
}

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  let adminClient: ReturnType<typeof createClient> | null = null;
  let payload: Partial<SendEmailPayload> | null = null;
  let companyId: string | null = null;
  let recipients: string[] = [];
  let subject = "Notificacion SmartOps";

  try {
    console.log(`[send_email_notification] request_id=${requestId} method=${req.method}`);

    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return jsonResponse(405, { error: "Method not allowed" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const smtpUser = Deno.env.get("GMAIL_SMTP_USER");
    const smtpPassword = Deno.env.get("GMAIL_SMTP_APP_PASSWORD");
    const senderName = Deno.env.get("MAIL_SENDER_NAME") ?? "SmartOps";
    const senderEmail = Deno.env.get("MAIL_SENDER_EMAIL") ?? smtpUser ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return jsonResponse(500, {
        error: "Missing SUPABASE_URL, SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY.",
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const accessToken = authHeader.replace("Bearer ", "").trim();
    const apiKeyHeader = req.headers.get("apikey")?.trim() ?? "";
    const internalServiceKey = req.headers.get("x-internal-service-role")?.trim() ?? "";

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const isServiceRoleRequest =
      accessToken === serviceRoleKey || apiKeyHeader === serviceRoleKey || internalServiceKey === serviceRoleKey;
    let authUserId: string | null = null;

    if (!isServiceRoleRequest) {
      if (!accessToken) {
        return jsonResponse(401, { error: "Missing authorization header" });
      }

      const { data: authData, error: authError } = await withTimeout(
        "auth.getUser",
        authClient.auth.getUser(accessToken),
        requestId
      );
      if (authError || !authData.user) {
        return jsonResponse(401, { error: "Invalid access token" });
      }
      authUserId = authData.user.id;
    }

    payload = (await req.json().catch(() => ({}))) as Partial<SendEmailPayload>;
    companyId = payload.companyId?.trim() ?? null;
    const to = payload.to;

    if (!to) {
      return jsonResponse(400, { error: "to es requerido (string o string[])." });
    }

    recipients = normalizeRecipients(to);
    if (recipients.length === 0) {
      return jsonResponse(400, { error: "No hay destinatarios validos." });
    }

    if (companyId && !isServiceRoleRequest) {
      const { data: companyMembership, error: membershipError } = await withTimeout(
        "db.validateCompanyMembership",
        adminClient
          .from("user_roles")
          .select("user_id")
          .eq("company_id", companyId)
          .eq("user_id", authUserId)
          .maybeSingle<UserRoleRow>(),
        requestId
      );

      if (membershipError) {
        return jsonResponse(400, { error: membershipError.message });
      }

      if (!companyMembership?.user_id) {
        return jsonResponse(403, { error: "No tienes acceso a la compania indicada." });
      }
    }

    if (!smtpUser || !smtpPassword || !senderEmail) {
      throw new Error("Missing GMAIL_SMTP_USER, GMAIL_SMTP_APP_PASSWORD or MAIL_SENDER_EMAIL env vars.");
    }

    subject = buildSubject(payload as SendEmailPayload);
    const html = buildHtml(payload as SendEmailPayload);
    const attachments = normalizeAttachments(payload.attachments);

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    const sendResult = await withTimeout(
      "smtp.sendMail",
      transporter.sendMail({
        from: `${senderName} <${senderEmail}>`,
        to: recipients.join(","),
        subject,
        html,
        attachments,
      }),
      requestId
    );

    await insertEmailLog({
      adminClient,
      companyId,
      payload,
      recipients,
      subject,
      status: "sent",
      providerMessageId: sendResult.messageId,
      responsePayload: {
        accepted: sendResult.accepted ?? [],
        rejected: sendResult.rejected ?? [],
      },
    });

    return jsonResponse(200, {
      success: true,
      messageId: sendResult.messageId,
      accepted: sendResult.accepted ?? [],
      rejected: sendResult.rejected ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[send_email_notification] request_id=${requestId} unhandled -> ${message}`);

    if (adminClient) {
      await insertEmailLog({
        adminClient,
        companyId,
        payload,
        recipients,
        subject,
        status: "failed",
        lastError: message,
        responsePayload: {
          requestId,
          error: message,
        },
      });
    }

    return jsonResponse(500, { error: "No se pudo enviar el correo.", details: message });
  }
});
