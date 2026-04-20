import { useCallback, useEffect, useRef, useState } from "react";
import useAuth from "./useAuth";
import type { CompanyEntitlements } from "../types/billing.types";
import { getCompanyEntitlements } from "../services/billing.service";

export default function useCompanyEntitlements() {
  const { companyProfile } = useAuth();
  const companyId = companyProfile?.id ?? null;

  const [data, setData] = useState<CompanyEntitlements | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!companyId) {
      setData(null);
      setLoading(false);
      setError(null);
      return null;
    }

    const requestId = (requestIdRef.current += 1);
    setLoading(true);
    setError(null);

    try {
      const result = await getCompanyEntitlements(companyId);
      if (!mountedRef.current || requestId !== requestIdRef.current) return null;
      setData(result);
      return result;
    } catch (err) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return null;
      setError(err instanceof Error ? err.message : "No se pudo cargar el plan.");
      return null;
    } finally {
      if (!mountedRef.current || requestId !== requestIdRef.current) return null;
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = () => {
      void refresh();
    };

    window.addEventListener("company-plan-changed", handler);
    return () => {
      window.removeEventListener("company-plan-changed", handler);
    };
  }, [refresh]);

  return { companyId, entitlements: data, loading, error, refresh };
}
