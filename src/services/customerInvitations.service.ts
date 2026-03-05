import { supabase } from "../libs/supabase";
import type { Customer } from "../types/customer.types";
import type { CreateInvitationInput } from "../types/interfaces";
import type { EmailInvitationPayload } from "../types/interfaces";

function normalizeInvitationEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  return normalized;
}

function assertValidInvitationEmail(email: string): string {
  const normalized = normalizeInvitationEmail(email);
  if (!normalized) {
    throw new Error("El cliente no tiene un email valido para enviar la invitacion.");
  }
  return normalized;
}

function mapInvitationError(raw: string): string {
  const normalized = raw.trim();
  let message = normalized;

  try {
    const parsed = JSON.parse(normalized) as { error?: string; message?: string };
    message = parsed.error ?? parsed.message ?? normalized;
  } catch {
    // Keep original message when response is not JSON
  }

  const lower = message.toLowerCase();
  if (lower.includes("already been registered") || lower.includes("already registered")) {
    return "Ya existe un usuario registrado con ese correo.";
  }

  if (lower.includes("already been invited")) {
    return "Ese correo ya tiene una invitacion activa.";
  }

  return message || "No se pudo enviar el correo de invitacion al cliente.";
}

async function sendEmailInvitationRequest(payload: EmailInvitationPayload): Promise<void> {
  const response = await requestEmailInvitation(payload);
  if (!response.success) {
    throw new Error("No se pudo enviar el correo de invitacion al cliente.");
  }
}

async function requestEmailInvitation(payload: EmailInvitationPayload): Promise<Record<string, unknown>> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const functionUrl =
    (import.meta.env.VITE_SUPABASE_EMAIL_INVITATION_URL as string | undefined) ??
    `${supabaseUrl?.replace(/\/$/, "")}/functions/v1/email_invitation`;

  if (!supabaseUrl || !supabaseAnonKey || !functionUrl) {
    throw new Error("Faltan variables de entorno de Supabase para enviar invitaciones.");
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    throw new Error(sessionError.message || "No se pudo validar la sesion actual.");
  }

  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error("Tu sesion expiro. Inicia sesion nuevamente para enviar invitaciones.");
  }

  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[customerInvitations] email_invitation_error", response.status, errorText);
    throw new Error(mapInvitationError(errorText));
  }

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return data;
}

export async function createAndSendCustomerInvitation({
  companyId,
  companyName,
  customerId,
  customerName,
  invitationEmail,
  invitedByUserId,
  appBaseUrl,
}: CreateInvitationInput): Promise<void> {
  const email = assertValidInvitationEmail(invitationEmail);
  const redirectTo = `${appBaseUrl.replace(/\/$/, "")}/update-password`;

  await sendEmailInvitationRequest({
    mode: "invite_existing_customer",
    email,
    redirectTo,
    customerId,
    companyId,
    invitedByUserId,
    customerName,
    companyName,
  });
}

export async function inviteCustomerAuthUser(input: {
  companyId: string;
  invitedByUserId: string;
  appBaseUrl: string;
  invitationEmail: string;
  customerName: string;
  customerIdCard?: string | null;
  customerType: "hogar" | "comercio" | "empresa";
  customerTaxId: string;
  customerPhone?: string | null;
}): Promise<string> {
  const email = assertValidInvitationEmail(input.invitationEmail);
  const redirectTo = `${input.appBaseUrl.replace(/\/$/, "")}/update-password`;

  const response = await requestEmailInvitation({
    mode: "invite_new_customer",
    email,
    redirectTo,
    companyId: input.companyId,
    invitedByUserId: input.invitedByUserId,
    customerName: input.customerName,
    customerIdCard: input.customerIdCard ?? null,
    customerType: input.customerType,
    customerTaxId: input.customerTaxId,
    customerPhone: input.customerPhone ?? null,
  });

  const authUserId = response.authUserId;
  if (typeof authUserId !== "string" || !authUserId) {
    throw new Error("No se recibio el authUserId de la invitacion.");
  }

  return authUserId;
}

export async function createCustomerViaInvitation(input: {
  companyId: string;
  invitedByUserId: string;
  appBaseUrl: string;
  invitationEmail: string;
  customerName: string;
  customerIdCard?: string | null;
  customerType: "hogar" | "comercio" | "empresa";
  customerTaxId: string;
  customerPhone?: string | null;
}): Promise<Customer> {
  const email = assertValidInvitationEmail(input.invitationEmail);
  const redirectTo = `${input.appBaseUrl.replace(/\/$/, "")}/update-password`;

  const response = await requestEmailInvitation({
    mode: "invite_new_customer",
    email,
    redirectTo,
    companyId: input.companyId,
    invitedByUserId: input.invitedByUserId,
    customerName: input.customerName,
    customerIdCard: input.customerIdCard ?? null,
    customerType: input.customerType,
    customerTaxId: input.customerTaxId,
    customerPhone: input.customerPhone ?? null,
  });

  const customer = response.customer as Customer | undefined;
  if (!customer?.id) {
    throw new Error("No se pudo crear el cliente invitado.");
  }

  return customer;
}

export async function rollbackInvitedAuthUser(input: {
  authUserId: string;
  companyId: string;
  invitedByUserId: string;
}): Promise<void> {
  await requestEmailInvitation({
    mode: "rollback_auth_user",
    email: "rollback@local.invalid",
    redirectTo: "http://localhost/rollback",
    companyId: input.companyId,
    invitedByUserId: input.invitedByUserId,
    authUserId: input.authUserId,
  });
}

export async function syncPendingInvitationEmail(
  companyId: string,
  customerId: string,
  email: string
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return;

  const { error } = await supabase
    .from("customer_invitations")
    .update({ email: normalizedEmail })
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString());

  if (error) {
    throw new Error(error.message || "No se pudo sincronizar email de invitacion pendiente.");
  }
}
