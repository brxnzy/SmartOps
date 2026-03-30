import { Navigate } from "react-router-dom";
import { DEFAULT_CUSTOMER_ROUTES } from "../constants/customerNavigation";
import useAuth from "../hooks/useAuth";
import RouteLoading from "./RouteLoading";

export default function CustomerDefaultRoute() {
  const { initializing, authzLoading } = useAuth();

  if (initializing || authzLoading) return <RouteLoading />;

  const firstRoute = DEFAULT_CUSTOMER_ROUTES[0];
  return <Navigate to={firstRoute?.to ?? "/customer/tickets"} replace />;
}
