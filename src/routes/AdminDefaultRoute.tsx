import { Navigate } from "react-router-dom";
import { DEFAULT_ADMIN_ROUTES } from "../constants/navigation";
import { useAuth } from "../hooks/useAuth";
import RouteLoading from "./RouteLoading";

export default function AdminDefaultRoute() {
  const { initializing, authzLoading, canAccess } = useAuth();

  if (initializing || authzLoading) return <RouteLoading />;

  const firstAllowedRoute = DEFAULT_ADMIN_ROUTES.find((route) => canAccess(route.permission));
  if (!firstAllowedRoute) return <Navigate to="/403" replace />;

  return <Navigate to={firstAllowedRoute.to} replace />;
}
