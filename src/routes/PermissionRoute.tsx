import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import RouteLoading from "./RouteLoading";

interface PermissionRouteProps {
  permission: string;
  children: ReactNode;
}

export default function PermissionRoute({ permission, children }: PermissionRouteProps) {
  const { initializing, authzLoading, canAccess } = useAuth();

  if (initializing || authzLoading) return <RouteLoading />;
  if (!canAccess(permission)) return <Navigate to="/403" replace />;

  return <>{children}</>;
}
