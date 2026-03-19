import { PERMISSIONS } from "./permissions";
import type { DefaultAdminRoute, SidebarItem } from "../types/Navigation";
import {
  Building2,
  Cpu,
  HardDrive,
  User,
  UsersRound,
  LayoutDashboard,
  Package,
  Settings,
  Shield,
  CalendarDays,
  ClipboardCheck,
  UserCheck2,
  Waypoints,
  Check,
  Workflow,
} from "lucide-react";

const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    name: "Dashboard",
    to: "/admin/dashboard",
    permission: PERMISSIONS.dashboardRead,
    icon: <LayoutDashboard />,
  },

  {
    name: "Usuarios",
    to: "/admin/users",
    permission: PERMISSIONS.usersRead,
    icon: <UsersRound />,
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
    name: "Agenda",
    to: "/admin/schedule",
    icon: <CalendarDays />,
  },
  {
    name: "Operaciones",
    icon: <Workflow />,
    children: [
      {
        name: "Levantamiento",
        to: "/admin/operaciones/visitas-tecnicas",
        permission: PERMISSIONS.siteSurveyRead,
        icon: <ClipboardCheck size={19} />,
      },
    ],
  },

  {
    name: "Inventario",
    icon: <Package />,
    children: [
      {
        name: "Dispositivos",
        to: "/admin/devices",
        permission: PERMISSIONS.devicesRead,
        icon: <Cpu size={19} />,
      },
    ],
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
      {
        name: "Marcas",
        to: "/admin/brands",
        permission: PERMISSIONS.settingsBrandsRead,
        icon: <Building2 size={19} />,
      },
      {
        name: "Plantillas de checklist",
        to: "/admin/checklist-templates",
        permission: PERMISSIONS.settingsChecklistTemplatesRead,
        icon: <Check size={19} />,
      },
      {
        name: "Mi cuenta",
        to: "/admin/account",
        icon: <User size={19} />,
      },
    ],
  },
];

export const DEFAULT_ADMIN_ROUTES: DefaultAdminRoute[] = SIDEBAR_ITEMS.flatMap(
  (item) => {
    if (item.children?.length) {
      return item.children.map(({ to, permission }) => ({ to, permission }));
    }

    if (!item.to) return [];
    return [{ to: item.to, permission: item.permission }];
  },
);

export default SIDEBAR_ITEMS;
