import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import RouteLoading from "./RouteLoading";

export default function AppEntryRoute() {
  const { session, initializing, authzLoading, roleProfile } = useAuth();

  if (initializing || authzLoading) return <RouteLoading />;
  if (!session) return <Navigate to="/login" replace />;

  if (roleProfile?.name?.trim().toLowerCase() === "customer") {
    return <Navigate to="/customer" replace />;
  }

  return <Navigate to="/admin" replace />;
}

