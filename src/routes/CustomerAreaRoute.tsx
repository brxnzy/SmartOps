import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import RouteLoading from "./RouteLoading";
import CustomerHome from "../screens/customer/CustomerHome";

export default function CustomerAreaRoute() {
  const { initializing, authzLoading, roleProfile } = useAuth();

  if (initializing || authzLoading) return <RouteLoading />;

  if (roleProfile?.name?.trim().toLowerCase() !== "customer") {
    return <Navigate to="/admin" replace />;
  }

  return <CustomerHome />;
}

