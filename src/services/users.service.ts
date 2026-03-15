import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../libs/supabase";
import type {
  CompanyUser,
  CompanyUserInput,
  CompanyUserQuery,
  CompanyUsersResult,
} from "../types/userManagement.types";
import { createUserViaInvitation } from "./userInvitations.service";

interface CompanyUserStatus {
  userId: string;
  bannedUntil: string | null;
  isDisabled: boolean;
}

interface UserStatusFunctionResponse {
  statuses?: CompanyUserStatus[];
  status?: CompanyUserStatus;
  error?: string;
  message?: string;
}

function buildErrorMessage(error: PostgrestError | null, fallback: string): string {
  if (!error) return fallback;

  if (error.code === "23505") {
    return "Ya existe un usuario con esa cedula.";
  }

  if (error.code === "23503") {
    return "Relacion invalida: verifica que el rol y la compania existan.";
  }

  return error.message || fallback;
}

function sanitizeSearch(value: string): string {
  return value.replace(/[(),]/g, " ").trim();
}

function mapUserStatusError(raw: string): string {
  const normalized = raw.trim();
  let message = normalized;

  try {
    const parsed = JSON.parse(normalized) as { error?: string; message?: string };
    message = parsed.error ?? parsed.message ?? normalized;
  } catch {
    // Keep original message when response is not JSON.
  }

  return message || "No se pudo actualizar el estado del usuario.";
}

async function requestUserStatus(payload: Record<string, unknown>): Promise<UserStatusFunctionResponse> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const functionUrl =
    (import.meta.env.VITE_SUPABASE_USER_STATUS_URL as string | undefined) ??
    `${supabaseUrl?.replace(/\/$/, "")}/functions/v1/user_status`;

  if (!supabaseUrl || !supabaseAnonKey || !functionUrl) {
    throw new Error("Faltan variables de entorno de Supabase para gestionar estado de usuarios.");
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    throw new Error(sessionError.message || "No se pudo validar la sesion actual.");
  }

  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error("Tu sesion expiro. Inicia sesion nuevamente.");
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
    console.error("[users.service] user_status_error", response.status, errorText);
    throw new Error(mapUserStatusError(errorText));
  }

  return (await response.json().catch(() => ({}))) as UserStatusFunctionResponse;
}

function mapUserRows(
  rows: Array<{
    id: string;
    user_id: string | null;
    company_id: string | null;
    role_id: string | null;
    users: {
      id: string;
      name: string;
      id_card: string | null;
      created_at: string;
      photo_url: string | null;
    } | null;
    roles: {
      id: string;
      name: string;
    } | null;
  }>
): CompanyUser[] {
  return rows
    .map((row): CompanyUser | null => {
      if (!row.user_id || !row.company_id || !row.role_id || !row.users || !row.roles) {
        return null;
      }

      return {
        id: row.users.id,
        userRoleId: row.id,
        companyId: row.company_id,
        name: row.users.name,
        idCard: row.users.id_card,
        photoUrl: row.users.photo_url ?? null,
        roleId: row.role_id,
        roleName: row.roles.name,
        createdAt: row.users.created_at,
        bannedUntil: null,
        isDisabled: false,
      };
    })
    .filter((item): item is CompanyUser => Boolean(item));
}

export async function listUsers(companyId: string, query: CompanyUserQuery): Promise<CompanyUsersResult> {
  const { data, error } = await supabase
    .from("user_roles")
    .select(
      "id, user_id, company_id, role_id, users:user_id ( id, name, id_card, created_at, photo_url ), roles:role_id ( id, name )"
    )
    .eq("company_id", companyId)
    .returns<
      Array<{
        id: string;
        user_id: string | null;
        company_id: string | null;
        role_id: string | null;
        users: {
          id: string;
          name: string;
          id_card: string | null;
          created_at: string;
          photo_url: string | null;
        } | null;
        roles: {
          id: string;
          name: string;
        } | null;
      }>
    >();

  if (error) {
    throw new Error(buildErrorMessage(error, "No se pudo cargar la lista de usuarios."));
  }

  let mapped = mapUserRows(data ?? []);

  if (query.roleId) {
    mapped = mapped.filter((item) => item.roleId === query.roleId);
  }

  const safeSearch = query.search ? sanitizeSearch(query.search).toLowerCase() : "";
  if (safeSearch) {
    mapped = mapped.filter((item) => {
      const searchable = [item.name, item.idCard ?? "", item.roleName].join(" ").toLowerCase();
      return searchable.includes(safeSearch);
    });
  }

  mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const from = (query.page - 1) * query.pageSize;
  const items = mapped.slice(from, from + query.pageSize);

  return {
    items,
    total: mapped.length,
  };
}

export async function listCompanyUsersStatus(companyId: string): Promise<CompanyUserStatus[]> {
  const response = await requestUserStatus({
    mode: "list_company_users_status",
    companyId,
  });

  return (response.statuses ?? []).map((status) => ({
    userId: status.userId,
    bannedUntil: status.bannedUntil ?? null,
    isDisabled: Boolean(status.isDisabled),
  }));
}

export async function setCompanyUserDisabledState(input: {
  companyId: string;
  targetUserId: string;
  disabled: boolean;
}): Promise<CompanyUserStatus> {
  const response = await requestUserStatus({
    mode: "set_user_disabled_state",
    companyId: input.companyId,
    targetUserId: input.targetUserId,
    disabled: input.disabled,
  });

  if (!response.status?.userId) {
    throw new Error("No se recibio confirmacion de estado del usuario.");
  }

  return {
    userId: response.status.userId,
    bannedUntil: response.status.bannedUntil ?? null,
    isDisabled: Boolean(response.status.isDisabled),
  };
}

export async function createUserWithInvitation(
  companyId: string,
  input: CompanyUserInput,
  invitation: {
    invitationEmail: string;
    invitedByUserId: string;
    appBaseUrl: string;
  }
): Promise<CompanyUser> {
  return createUserViaInvitation({
    companyId,
    invitedByUserId: invitation.invitedByUserId,
    appBaseUrl: invitation.appBaseUrl,
    invitationEmail: invitation.invitationEmail,
    userName: input.name,
    userIdCard: input.idCard,
    roleId: input.roleId,
  });
}

export async function updateUserRole(
  companyId: string,
  userId: string,
  roleId: string
): Promise<void> {
  const { data: existing, error: checkError } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .maybeSingle<{ id: string }>();

  if (checkError) {
    throw new Error(buildErrorMessage(checkError, "No se pudo validar el rol actual del usuario."));
  }

  if (!existing?.id) {
    throw new Error("No se encontro la asignacion de rol para este usuario en la compania.");
  }

  const { error } = await supabase
    .from("user_roles")
    .update({ role_id: roleId })
    .eq("id", existing.id);

  if (error) {
    throw new Error(buildErrorMessage(error, "No se pudo actualizar el rol del usuario."));
  }
}
