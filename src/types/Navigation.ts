import type { AppPermission } from "../constants/permissions";
import type { ReactNode } from "react";

export interface DefaultAdminRoute {
  to: string;
  permission?: AppPermission;
}

export interface SidebarChildItem {
  name: string;
  to: string;
  permission?: AppPermission;
  icon?: ReactNode;
}

export interface SidebarItem {
  name: string;
  to?: string;
  permission?: AppPermission;
  icon: ReactNode;
  children?: SidebarChildItem[];
}
