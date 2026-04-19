import { Navigate } from "react-router-dom";
import { DEFAULT_SUPERADMIN_ROUTES } from "../constants/superadminNavigation";
import useAuth from "../hooks/useAuth";
import RouteLoading from "./RouteLoading";

export default function SuperAdminDefaultRoute() {
  const { initializing, authzLoading } = useAuth();

  if (initializing || authzLoading) return <RouteLoading />;

  const firstRoute = DEFAULT_SUPERADMIN_ROUTES[0];
  return <Navigate to={firstRoute?.to ?? "/superadmin/dashboard"} replace />;
}
