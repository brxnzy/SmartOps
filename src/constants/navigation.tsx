import { PERMISSIONS } from "./permissions";
import type { DefaultAdminRoute, SidebarItem} from "../types/Navigation";
import { Cpu,HardDrive, LayoutDashboard, Settings, Shield, UserCheck2, Waypoints } from "lucide-react";

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
  },
  {
    name: "Dispositivos",
    to: "/admin/devices",
    permission: PERMISSIONS.devicesRead,
    icon: <Cpu  />,
  },
  {
    name: "Configuracion",
    icon: <Settings />,
    children: [
      {
        name: "Protocolos",
        to: "/admin/protocols",
        permission: PERMISSIONS.settingsProtocolsRead,
        icon: <Waypoints size={19} />,
      },
      {
        name: "Tipos de dispositivos",
        to: "/admin/devices-types",
        permission: PERMISSIONS.settingsDeviceTypesRead,
        icon: <HardDrive size={19} />,
      },
    ],
  },
];

export const DEFAULT_ADMIN_ROUTES: DefaultAdminRoute[] = SIDEBAR_ITEMS.flatMap((item) => {
  if (item.children?.length) {
    return item.children.map(({ to, permission }) => ({ to, permission }));
  }

  if (!item.to) return [];
  return [{ to: item.to, permission: item.permission }];
});
