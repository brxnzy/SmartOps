import { PERMISSIONS } from "./permissions";
import type { DefaultAdminRoute, SidebarItem} from "../types/Navigation";
import { LayoutDashboard, UserCheck2, Shield} from "lucide-react";

export const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    name: "Dashboard",
    to: "/admin/dashboard",
    permission: PERMISSIONS.dashboardRead,  
    icon: <LayoutDashboard />,
  },

  {
    name: "Clientes",
    to: "/admin/customers",
    permission: PERMISSIONS.customersRead,
    icon: <UserCheck2 />,
  },

  {
    name: "Roles",
    to: "/admin/roles",
    permission: PERMISSIONS.rolesRead, 
    icon: <Shield />,
  }
];

export const DEFAULT_ADMIN_ROUTES: DefaultAdminRoute[] = SIDEBAR_ITEMS.map(({ to, permission }) => ({
  to,
  permission,
}));
