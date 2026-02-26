import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../libs/supabase";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      setIsAuthenticated(!!data.session);
      setLoading(false);
    };

    checkSession();
  }, []);

  if (loading) return null; // o un spinner

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}