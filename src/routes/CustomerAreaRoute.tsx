import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import RouteLoading from "./RouteLoading";
import Sidebar from "../layouts/Sidebar";
import { isCustomerRole } from "../utils/roles";

export default function CustomerAreaRoute() {
  const { initializing, authzLoading, roleProfile } = useAuth();

  if (initializing || authzLoading) return <RouteLoading />;

  if (!isCustomerRole(roleProfile?.name)) {
    return <Navigate to="/admin" replace />;
  }

  return <Sidebar />;
}
