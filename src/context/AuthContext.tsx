import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { supabase } from "../libs/supabase";
import { logoutUser } from "../services/auth.service";
import { getUserCompanyAndRole } from "../services/company.service";
import { getPermissionsByRoleId } from "../services/permission.service";
import { getUserProfileById } from "../services/profile.service";
import { notifications } from "../services/notification.service";
import type { AuthContextType } from "../types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const normalizePermissionCode = (code: string) => code.trim().toLowerCase();

export default AuthContext;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<AuthContextType["userProfile"]>(null);
  const [companyProfile, setCompanyProfile] = useState<AuthContextType["companyProfile"]>(null);
  const [roleProfile, setRoleProfile] = useState<AuthContextType["roleProfile"]>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [initializing, setInitializing] = useState(true);
  const [authzLoading, setAuthzLoading] = useState(false);
  const loadingToastIdRef = useRef<string | null>(null);
  const hydratedUserIdRef = useRef<string | null>(null);

  const resetAuthData = useCallback(() => {
    setUserProfile(null);
    setCompanyProfile(null);
    setRoleProfile(null);
    setPermissions([]);
    hydratedUserIdRef.current = null;
  }, []);

  const loadDomainProfile = useCallback(async (userId: string) => {
    const [profileData, relationData] = await Promise.all([
      getUserProfileById(userId),
      getUserCompanyAndRole(userId),
    ]);

    setUserProfile(profileData);
    setCompanyProfile(relationData.companyProfile);
    setRoleProfile(relationData.roleProfile);

    if (!relationData.roleProfile?.id) {
      setPermissions([]);
      return;
    }

    const loadedPermissions = await getPermissionsByRoleId(relationData.roleProfile.id);
    setPermissions(loadedPermissions.map(normalizePermissionCode));
  }, []);

  const syncAuthState = useCallback(
    async (currentSession: Session | null) => {
      setSession(currentSession);
      setAuthUser(currentSession?.user ?? null);

      if (!currentSession?.user) {
        resetAuthData();
        return;
      }

      await loadDomainProfile(currentSession.user.id);
    },
    [loadDomainProfile, resetAuthData]
  );

  useEffect(() => {
    const getInitialSession = async () => {
      setInitializing(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (data.session?.user) {
          setAuthzLoading(true);
        }

        await syncAuthState(data.session);
        hydratedUserIdRef.current = data.session?.user?.id ?? null;
      } catch (error) {
        console.error("Error cargando sesion inicial:", error);
        resetAuthData();
      } finally {
        setAuthzLoading(false);
        setInitializing(false);
      }
    };

    getInitialSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, currentSession) => {
      setSession(currentSession);
      setAuthUser(currentSession?.user ?? null);

      if (!currentSession?.user) {
        resetAuthData();
        setAuthzLoading(false);
        return;
      }

      // A token refresh should not force a full authz reload/flicker in admin routes.
      if (event === "TOKEN_REFRESHED") {
        return;
      }

      const userId = currentSession.user.id;
      const isHydratedUser = hydratedUserIdRef.current === userId;

      // Supabase can emit SIGNED_IN again when a tab regains focus.
      // If authz for this user is already hydrated, skip blocking reload.
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && isHydratedUser) {
        return;
      }

      if (!isHydratedUser) {
        setAuthzLoading(true);
      }

      loadDomainProfile(userId)
        .then(() => {
          hydratedUserIdRef.current = userId;
        })
        .catch((error) => {
          console.error("Error sincronizando sesion:", error);
          resetAuthData();
        })
        .finally(() => {
          if (!isHydratedUser) {
            setAuthzLoading(false);
          }
        });
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [loadDomainProfile, resetAuthData, syncAuthState]);

  const logout = async () => {
    await logoutUser();
  };

  const refreshProfile = async () => {
    if (!authUser?.id) return;
    await loadDomainProfile(authUser.id);
    hydratedUserIdRef.current = authUser.id;
  };

  const permissionsSet = useMemo(() => new Set(permissions), [permissions]);

  const canAccess = useCallback(
    (permissionCode: string) => permissionsSet.has(normalizePermissionCode(permissionCode)),
    [permissionsSet]
  );

  useEffect(() => {
    const showLoadingToast = initializing || authzLoading;

    if (showLoadingToast && !loadingToastIdRef.current) {
      loadingToastIdRef.current = notifications.loading({
        title: "Cargando",
        description: "Validando sesion y permisos...",
        duration: null,
      });
      return;
    }

    if (!showLoadingToast && loadingToastIdRef.current) {
      notifications.dismiss(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    }
  }, [authzLoading, initializing]);

  useEffect(
    () => () => {
      if (!loadingToastIdRef.current) return;
      notifications.dismiss(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        authUser,
        session,
        userProfile,
        companyProfile,
        roleProfile,
        permissions,
        loading: initializing,
        initializing,
        authzLoading,
        canAccess,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
