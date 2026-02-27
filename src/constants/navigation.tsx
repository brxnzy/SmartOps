import { PERMISSIONS } from "./permissions";
import type { DefaultAdminRoute, SidebarItem} from "../types/Navigation";
import { LayoutDashboard, UserCheck2} from "lucide-react";

export const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    name: "Dashboard",
    to: "/admin/dashboard",
    permission: PERMISSIONS.dashboardRead,  
    icon: <LayoutDashboard className="w-5 h-5" />,
  },

  {
    name: "Clientes",
    to: "/admin/customers",
    permission: PERMISSIONS.customersRead,
    icon: <UserCheck2 className="w-5 h-5" />,
  },
];

export const DEFAULT_ADMIN_ROUTES: DefaultAdminRoute[] = SIDEBAR_ITEMS.map(({ to, permission }) => ({
  to,
  permission,
}));
