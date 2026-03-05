import { supabase } from "../libs/supabase";
import type { RolePermissionRow } from "../types/types";

export async function getPermissionsByRoleId(roleId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("roles_permissions")
    .select("permissions:permission_id ( code )")
    .eq("role_id", roleId)
    .returns<RolePermissionRow[]>();

  if (error) throw error;

  const permissionCodes = (data ?? [])
    .map((row) => row.permissions?.code)
    .filter((code): code is string => Boolean(code));

  return Array.from(new Set(permissionCodes));
}
