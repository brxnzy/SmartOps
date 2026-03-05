import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import RouteLoading from "./RouteLoading";

interface Props {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const { session, initializing } = useAuth();

  if (initializing) return <RouteLoading />;
  if (!session) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
