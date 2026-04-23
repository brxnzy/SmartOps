import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getActiveSupportImpersonation, stopSupportImpersonation } from "../services/support.service";
import { isSuperAdminRole } from "../utils/roles";
import { useAuth } from "../hooks/useAuth";
import type { ActiveSupportImpersonation } from "../types/support.types";

export type SupportImpersonationContextValue = {
  active: ActiveSupportImpersonation | null;
  loading: boolean;
  refresh: () => Promise<void>;
  stop: () => Promise<void>;
};

const SupportImpersonationContext = createContext<SupportImpersonationContextValue | undefined>(undefined);

export default SupportImpersonationContext;

export function SupportImpersonationProvider({ children }: { children: ReactNode }) {
  const { roleProfile } = useAuth();
  const isSuperAdmin = isSuperAdminRole(roleProfile?.name);

  const [active, setActive] = useState<ActiveSupportImpersonation | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isSuperAdmin) {
      setActive(null);
      return;
    }
    setLoading(true);
    try {
      const current = await getActiveSupportImpersonation();
      setActive(current);
    } catch {
      setActive(null);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  const stop = useCallback(async () => {
    if (!isSuperAdmin) return;
    await stopSupportImpersonation();
    await refresh();
  }, [isSuperAdmin, refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      active,
      loading,
      refresh,
      stop,
    }),
    [active, loading, refresh, stop]
  );

  return <SupportImpersonationContext.Provider value={value}>{children}</SupportImpersonationContext.Provider>;
}

