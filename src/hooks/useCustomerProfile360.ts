import { useCallback, useEffect, useState } from "react";
import { getCustomerProfile360 } from "../services/customerProfile360.service";
import type { CustomerProfile360Data } from "../types/customerProfile360.types";
import type { UseCustomerProfile360Options } from "../types/interfaces";


export function useCustomerProfile360({
  companyId,
  customerId,
}: UseCustomerProfile360Options) {
  const [data, setData] = useState<CustomerProfile360Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId || !customerId) {
      setData(null);
      setError("No se encontro la compania o el cliente solicitado.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const profile = await getCustomerProfile360(companyId, customerId);
      setData(profile);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo cargar el perfil 360 del cliente.";
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [companyId, customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    data,
    loading,
    error,
    refresh: load,
  };
}
