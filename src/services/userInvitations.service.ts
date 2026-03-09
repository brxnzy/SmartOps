import { supabase } from "../libs/supabase";
import type { EmailInvitationPayload } from "../types/interfaces";
import type { CompanyUser } from "../types/userManagement.types";

function assertValidEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    throw new Error("Debes indicar un email valido para enviar la invitacion.");
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
    // Keep original message when response is not JSON.
  }

  const lower = message.toLowerCase();
  if (lower.includes("already been registered") || lower.includes("already registered")) {
    return "Ya existe un usuario registrado con ese correo.";
  }

  if (lower.includes("already been invited")) {
    return "Ese correo ya tiene una invitacion activa.";
  }

  return message || "No se pudo enviar el correo de invitacion.";
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
    console.error("[userInvitations] email_invitation_error", response.status, errorText);
    throw new Error(mapInvitationError(errorText));
  }

  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

export async function createUserViaInvitation(input: {
  companyId: string;
  invitedByUserId: string;
  appBaseUrl: string;
  invitationEmail: string;
  userName: string;
  userIdCard?: string | null;
  roleId: string;
}): Promise<CompanyUser> {
  const email = assertValidEmail(input.invitationEmail);
  const redirectTo = `${input.appBaseUrl.replace(/\/$/, "")}/update-password`;

  const response = await requestEmailInvitation({
    mode: "invite_new_user",
    email,
    redirectTo,
    companyId: input.companyId,
    invitedByUserId: input.invitedByUserId,
    userName: input.userName,
    userIdCard: input.userIdCard ?? null,
    roleId: input.roleId,
  });

  const user = response.user as CompanyUser | undefined;
  if (!user?.id) {
    throw new Error("No se pudo crear el usuario invitado.");
  }

  return user;
}
