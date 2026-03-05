import { supabase } from "../libs/supabase";
interface CreateInvitationInput {
  companyId: string;
  companyName: string;
  customerId: string;
  customerName: string;
  invitationEmail: string;
  invitedByUserId: string;
  appBaseUrl: string;
}

interface EmailInvitationPayload {
  email: string;
  redirectTo: string;
  customerId: string;
  companyId: string;
  invitedByUserId: string;
  customerName: string;
  companyName: string;
}

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

async function sendEmailInvitationRequest(payload: EmailInvitationPayload): Promise<void> {
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
    throw new Error(errorText || "No se pudo enviar el correo de invitacion al cliente.");
  }
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
    email,
    redirectTo,
    customerId,
    companyId,
    invitedByUserId,
    customerName,
    companyName,
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
