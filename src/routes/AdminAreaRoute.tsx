import { Navigate } from "react-router-dom";
import Sidebar from "../layouts/Sidebar";
import { useAuth } from "../hooks/useAuth";
import RouteLoading from "./RouteLoading";

export default function AdminAreaRoute() {
  const { initializing, authzLoading, roleProfile } = useAuth();

  if (initializing || authzLoading) return <RouteLoading />;

  if (roleProfile?.name?.trim().toLowerCase() === "customer") {
    return <Navigate to="/customer" replace />;
  }

  return <Sidebar />;
}

