import { Navigate } from "react-router-dom";
import Sidebar from "../layouts/Sidebar";
import { useAuth } from "../hooks/useAuth";
import RouteLoading from "./RouteLoading";
import { isCustomerRole, isSuperAdminRole } from "../utils/roles";

export default function SuperAdminAreaRoute() {
  const { initializing, authzLoading, roleProfile } = useAuth();

  if (initializing || authzLoading) return <RouteLoading />;

  const roleName = roleProfile?.name;

  if (isCustomerRole(roleName)) {
    return <Navigate to="/customer" replace />;
  }

  if (!isSuperAdminRole(roleName)) {
    return <Navigate to="/admin" replace />;
  }

  return <Sidebar />;
}
