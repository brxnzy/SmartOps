import { PERMISSIONS } from "./permissions";
import type { DefaultAdminRoute, SidebarItem} from "../types/Navigation";
import {
  Building2,
  Check,
  ClipboardCheck,
  ClipboardList,
  Cpu,
  HardDrive,
  LayoutDashboard,
  Package,
  PackageOpen,
  PackagePlus,
  Settings,
  Shield,
  Tag,
  Truck,
  User,
  UserCheck2,
  UsersRound,
  Waypoints,
  Workflow,
  CalendarDays,
} from "lucide-react";


const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    name: "Dashboard",
    to: "/admin/dashboard",
    permission: PERMISSIONS.dashboardRead,
    icon: <LayoutDashboard />,
  },
  {
    name: "Administracion",
    icon: <Shield />,
    children: [
      {
        name: "Usuarios",
        to: "/admin/users",
        permission: PERMISSIONS.usersRead,
        icon: <UsersRound size={19} />,
      },
      {
        name: "Roles",
        to: "/admin/roles",
        permission: PERMISSIONS.rolesRead,
        icon: <Shield size={19} />,
      },
      {
        name: "Proveedores",
        to: "/admin/suppliers",
        permission: PERMISSIONS.suppliersRead,
        icon: <Truck size={19} />,
      },
    ],
  },
  {
    name: "Clientes",
    to: "/admin/customers",
    permission: PERMISSIONS.customersRead,
    icon: <UserCheck2 />,
  },
  {
    name: "Operaciones",
    icon: <Workflow />,
    children: [
      {
        name: "Tickets",
        to: "/admin/tickets",
        permission: PERMISSIONS.ticketsRead,
        icon: <ClipboardList size={19} />,
      },
      {
        name: "Agenda",
        to: "/admin/schedule",
        icon: <CalendarDays size={19} />,
      },
      {
        name: "Levantamiento",
        to: "/admin/site_surveys",
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
        name: "Inventario",
        to: "/admin/inventory/devices",
        permission: PERMISSIONS.deviceInventoryRead,
        icon: <Package size={19} />,
      },
      {
        name: "Dispositivos",
        to: "/admin/devices",
        permission: PERMISSIONS.devicesRead,
        icon: <Cpu size={19} />,
      },
      {
        name: "Cargas",
        to: "/admin/inventory/loads",
        permission: PERMISSIONS.inventoryLoadsRead,
        icon: <PackagePlus size={19} />,
      },
      {
        name: "Kits",
        to: "/admin/inventory/kits",
        permission: PERMISSIONS.kitsRead,
        icon: <PackageOpen size={19} />,
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
        name: "Categorias de tickets",
        to: "/admin/ticket-categories",
        permission: PERMISSIONS.settingsTicketCategoriesRead,
        icon: <Tag size={19} />,
      },
      {
        name: "Mi cuenta",
        to: "/admin/account",
        icon: <User size={19} />
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
        name: "Logs",
        to: "/admin/logs",
        permission: PERMISSIONS.settingsLogsRead,
        icon: <ClipboardList size={19} />,
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
