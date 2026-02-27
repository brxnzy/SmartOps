import { supabase } from "../libs/supabase";

type RolePermissionRow = {
  permissions: {
    code: string;
  } | null;
};

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
