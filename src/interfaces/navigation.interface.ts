import type { AppPermission } from "../constants/permissions";

export interface DefaultAdminRoute {
  to: string;
  permission: AppPermission;
}
