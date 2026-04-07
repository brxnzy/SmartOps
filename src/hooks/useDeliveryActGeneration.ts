import { useCallback, useEffect, useState } from "react";
import { notifications } from "../services/notification.service";
import type { DeliveryAct } from "../types/deliveryAct.types";
import { generateDeliveryAct, getDeliveryActByProject } from "../services/deliveryAct.service";

export default function useDeliveryActGeneration(projectId: string | null) {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [act, setAct] = useState<DeliveryAct | null>(null);

  const loadAct = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await getDeliveryActByProject(projectId);
      setAct(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadAct();
  }, [loadAct]);

  const generate = useCallback(async () => {
    if (!projectId) return null;
    setCreating(true);
    try {
      console.info("[useDeliveryActGeneration] generate:start", { projectId });
      const result = await generateDeliveryAct(projectId);
      console.info("[useDeliveryActGeneration] generate:success", { projectId, result });
      notifications.success({
        title: "Acta generada",
        description: "El acta fue creada correctamente.",
      });
      await loadAct();
      return result;
    } catch (err) {
      console.error("[useDeliveryActGeneration] generate:error", err);
      notifications.error({
        title: "Error generando acta",
        description: err instanceof Error ? err.message : "No se pudo generar el acta.",
      });
      return null;
    } finally {
      setCreating(false);
    }
  }, [loadAct, projectId]);

  return {
    act,
    loading,
    creating,
    generate,
    reload: loadAct,
  };
}
