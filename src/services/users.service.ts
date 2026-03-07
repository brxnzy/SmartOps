import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../libs/supabase";
import type {
  CompanyUser,
  CompanyUserInput,
  CompanyUserQuery,
  CompanyUsersResult,
} from "../types/userManagement.types";
import { createUserViaInvitation } from "./userInvitations.service";

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
    } | null;
    roles: {
      id: string;
      name: string;
    } | null;
  }>
): CompanyUser[] {
  return rows
    .map((row) => {
      if (!row.user_id || !row.company_id || !row.role_id || !row.users || !row.roles) {
        return null;
      }

      return {
        id: row.users.id,
        userRoleId: row.id,
        companyId: row.company_id,
        name: row.users.name,
        idCard: row.users.id_card,
        roleId: row.role_id,
        roleName: row.roles.name,
        createdAt: row.users.created_at,
      } satisfies CompanyUser;
    })
    .filter((item): item is CompanyUser => Boolean(item));
}

export async function listUsers(companyId: string, query: CompanyUserQuery): Promise<CompanyUsersResult> {
  const { data, error } = await supabase
    .from("user_roles")
    .select(
      "id, user_id, company_id, role_id, users:user_id ( id, name, id_card, created_at ), roles:role_id ( id, name )"
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
