import type { PermissionRouteProps } from "../types/interfaces";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import RouteLoading from "./RouteLoading";


export default function PermissionRoute({ permission, children }: PermissionRouteProps) {
  const { initializing, authzLoading, canAccess } = useAuth();

  if (initializing || authzLoading) return <RouteLoading />;
  if (!canAccess(permission)) return <Navigate to="/403" replace />;

  return <>{children}</>;
}
