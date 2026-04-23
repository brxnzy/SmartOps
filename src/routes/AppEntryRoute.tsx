import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import RouteLoading from "./RouteLoading";
import { isCustomerRole, isSuperAdminRole } from "../utils/roles";

export default function AppEntryRoute() {
  const { session, initializing, authzLoading, roleProfile } = useAuth();

  if (initializing || authzLoading) return <RouteLoading />;
  if (!session) return <Navigate to="/login" replace />;

  if (isCustomerRole(roleProfile?.name)) {
    return <Navigate to="/customer" replace />;
  }

  if (isSuperAdminRole(roleProfile?.name)) {
    return <Navigate to="/superadmin" replace />;
  }

  return <Navigate to="/admin" replace />;
}
