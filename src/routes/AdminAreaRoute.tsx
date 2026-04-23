import { Navigate } from "react-router-dom";
import Sidebar from "../layouts/Sidebar";
import { useAuth } from "../hooks/useAuth";
import RouteLoading from "./RouteLoading";
import { isCustomerRole, isSuperAdminRole } from "../utils/roles";

export default function AdminAreaRoute() {
  const { initializing, authzLoading, roleProfile } = useAuth();

  if (initializing || authzLoading) return <RouteLoading />;

  if (isCustomerRole(roleProfile?.name)) {
    return <Navigate to="/customer" replace />;
  }

  if (isSuperAdminRole(roleProfile?.name)) {
    return <Navigate to="/superadmin" replace />;
  }

  return <Sidebar />;
}
