/**
 * AuthContext (Supabase Version)
 * -------------------------------
 * Este contexto:
 * - Escucha cambios de autenticación en Supabase
 * - Mantiene el usuario sincronizado automáticamente
 * - Expone login y logout
 * - Provee loading inicial para evitar parpadeos en rutas
 */

import { createContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../libs/supabase";
import { logoutUser } from "../services/auth.service";
import type { AuthContextType } from "../types/auth";

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export default AuthContext;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /**
     * 1️⃣ Obtener sesión actual al cargar la app
     */
    const getInitialSession = async () => {
      const { data } = await supabase.auth.getSession();

      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    /**
     * 2️⃣ Escuchar cambios de autenticación
     */
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    /**
     * 3️⃣ Limpiar listener al desmontar
     */
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  /**
   * Cerrar sesión
   */
  const logout = async () => {
    await logoutUser();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
