import type { AppPermission } from "../constants/permissions";



export interface DefaultAdminRoute {
  to: string;
  permission: AppPermission;
}

export interface SidebarItem {
  name: string;
  to: string;
  permission: AppPermission;
  icon: React.ReactNode;
}
