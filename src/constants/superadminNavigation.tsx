/* eslint-disable react-refresh/only-export-components */
import { LayoutDashboard, LifeBuoy } from "lucide-react";
import type { DefaultAdminRoute, SidebarItem } from "../types/Navigation";

const SUPERADMIN_SIDEBAR_ITEMS: SidebarItem[] = [
  {
    name: "Resumen",
    to: "/superadmin/dashboard",
    icon: <LayoutDashboard />,
  },
  {
    name: "Soporte",
    to: "/superadmin/support",
    icon: <LifeBuoy />,
  },
];

export const DEFAULT_SUPERADMIN_ROUTES: DefaultAdminRoute[] = [
  {
    to: "/superadmin/dashboard",
  },
];

export default SUPERADMIN_SIDEBAR_ITEMS;
