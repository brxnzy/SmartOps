import { supabase } from "../libs/supabase";

export interface Permission {
  id: string;
  code: string;
}

type RolePermissionByRoleRow = {
  role_id: string;
  permissions: {
    code: string;
  } | null;
};

type RolePermissionByRoleId = Record<string, string[]>;

export async function getAllPermissions(): Promise<Permission[]> {
  const { data, error } = await supabase
    .from("permissions")
    .select("id, code")
    .order("code", { ascending: true })
    .returns<Permission[]>();

  if (error) throw error;

  return data ?? [];
}

export async function getPermissionsByRoleId(roleId: string): Promise<string[]> {
  const permissionsByRole = await getPermissionsByRoleIds([roleId]);
  return permissionsByRole[roleId] ?? [];
}

export async function getPermissionsByRoleIds(roleIds: string[]): Promise<RolePermissionByRoleId> {
  if (roleIds.length === 0) return {};

  const { data, error } = await supabase
    .from("roles_permissions")
    .select("role_id, permissions:permission_id ( code )")
    .in("role_id", roleIds)
    .returns<RolePermissionByRoleRow[]>();

  if (error) throw error;

  const grouped = (data ?? []).reduce<RolePermissionByRoleId>((acc, row) => {
    const code = row.permissions?.code;
    if (!code) return acc;

    const current = acc[row.role_id] ?? [];
    if (!current.includes(code)) {
      acc[row.role_id] = [...current, code].sort((a, b) => a.localeCompare(b));
    }

    return acc;
  }, {});

  for (const roleId of roleIds) {
    if (!grouped[roleId]) grouped[roleId] = [];
  }

  return grouped;
}

export async function syncRolePermissions(roleId: string, permissionCodes: string[]): Promise<void> {
  const uniqueCodes = Array.from(new Set(permissionCodes));

  const { error: deleteError } = await supabase
    .from("roles_permissions")
    .delete()
    .eq("role_id", roleId);

  if (deleteError) throw deleteError;

  if (uniqueCodes.length === 0) return;

  const { data: permissions, error: permissionsError } = await supabase
    .from("permissions")
    .select("id, code")
    .in("code", uniqueCodes)
    .returns<Permission[]>();

  if (permissionsError) throw permissionsError;

  const validIds = new Map((permissions ?? []).map((permission) => [permission.code, permission.id]));
  const missingCodes = uniqueCodes.filter((code) => !validIds.has(code));

  if (missingCodes.length > 0) {
    throw new Error(`Permisos no encontrados: ${missingCodes.join(", ")}`);
  }

  const rows = uniqueCodes.map((code) => ({
    role_id: roleId,
    permission_id: validIds.get(code) as string,
  }));

  const { error: insertError } = await supabase.from("roles_permissions").insert(rows);

  if (insertError) throw insertError;
}
