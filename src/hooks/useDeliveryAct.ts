import { useCallback, useEffect, useState } from "react";
import { notifications } from "../services/notification.service";
import type { DeliveryAct } from "../types/deliveryAct.types";
import { getDeliveryActById, signDeliveryAct } from "../services/deliveryAct.service";

export default function useDeliveryAct(actId: string | null) {
  const [act, setAct] = useState<DeliveryAct | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAct = useCallback(async () => {
    if (!actId) return;
    setLoading(true);
    setError(null);
    try {
      console.info("[useDeliveryAct] loadAct:start", { actId });
      const data = await getDeliveryActById(actId);
      console.info("[useDeliveryAct] loadAct:success", { actId, status: data.status });
      setAct(data);
    } catch (err) {
      console.error("[useDeliveryAct] loadAct:error", err);
      const message = err instanceof Error ? err.message : "No se pudo cargar el acta.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [actId]);

  useEffect(() => {
    void loadAct();
  }, [loadAct]);

  const acceptAct = useCallback(async () => {
    if (!actId) return;
    setSigning(true);
    try {
      console.info("[useDeliveryAct] acceptAct:start", { actId });
      const result = await signDeliveryAct(actId, null);
      console.info("[useDeliveryAct] acceptAct:success", { actId });
      notifications.success({
        title: "Acta aceptada",
        description: result.paymentAccountId
          ? "El acta fue aceptada, el proyecto se finalizo y el pago fue generado."
          : "El acta fue aceptada y el proyecto se finalizo.",
      });
      await loadAct();
    } catch (err) {
      console.error("[useDeliveryAct] acceptAct:error", err);
      notifications.error({
        title: "Error aceptando acta",
        description: err instanceof Error ? err.message : "No se pudo aceptar el acta.",
      });
    } finally {
      setSigning(false);
    }
  }, [actId, loadAct]);

  const signAct = useCallback(
    async (signature: string) => {
      if (!actId) return;
      setSigning(true);
      try {
        console.info("[useDeliveryAct] signAct:start", { actId, hasSignature: Boolean(signature) });
        const result = await signDeliveryAct(actId, signature);
        console.info("[useDeliveryAct] signAct:success", { actId });
        notifications.success({
          title: "Acta firmada",
          description: result.paymentAccountId
            ? "La firma fue registrada correctamente y el pago fue generado."
            : "La firma fue registrada correctamente.",
        });
        await loadAct();
      } catch (err) {
        console.error("[useDeliveryAct] signAct:error", err);
        notifications.error({
          title: "Error firmando acta",
          description: err instanceof Error ? err.message : "No se pudo firmar el acta.",
        });
      } finally {
        setSigning(false);
      }
    },
    [actId, loadAct]
  );

  return {
    act,
    loading,
    signing,
    error,
    reload: loadAct,
    acceptAct,
    signAct,
  };
}
