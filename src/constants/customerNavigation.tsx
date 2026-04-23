import type { DefaultAdminRoute, SidebarItem } from "../types/Navigation";
import { Bell, ClipboardList, FileText, UserRound, WalletCards } from "lucide-react";

const CUSTOMER_SIDEBAR_ITEMS: SidebarItem[] = [
  {
    name: "Mis tickets",
    to: "/customer/tickets",
    icon: <ClipboardList />,
  },
  {
    name: "Cotizaciones",
    to: "/customer/quotes",
    icon: <FileText />,
  },
  {
    name: "Pagos",
    to: "/customer/payments",
    icon: <WalletCards />,
  },
  {
    name: "Notificaciones",
    to: "/customer/notifications",
    icon: <Bell />,
  },
  {
    name: "Mi perfil",
    to: "/customer/profile",
    icon: <UserRound />,
  },
];

export const DEFAULT_CUSTOMER_ROUTES: DefaultAdminRoute[] = CUSTOMER_SIDEBAR_ITEMS.filter(
  (item) => Boolean(item.to)
).map((item) => ({ to: item.to as string }));

export default CUSTOMER_SIDEBAR_ITEMS
