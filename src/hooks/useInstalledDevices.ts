import { useCallback, useEffect, useMemo, useState } from "react";
import type { InstalledDeviceListItem } from "../types/installedDevice.types";
import {
  listInstalledDevicesByProject,
  upsertInstalledDevicesFromLayout,
} from "../services/installedDevices.service";
import { notifications } from "../services/notification.service";
import type { SurveyLayout } from "../types/siteSurveyExecution.types";

type UseInstalledDevicesParams = {
  companyId: string | null;
  projectId: string | null;
  installedBy: string | null;
};

export default function useInstalledDevices({ companyId, projectId, installedBy }: UseInstalledDevicesParams) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<InstalledDeviceListItem[]>([]);
  const [syncing, setSyncing] = useState(false);

  const canLoad = Boolean(companyId && projectId);

  const load = useCallback(async () => {
    if (!companyId || !projectId) {
      setDevices([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const rows = await listInstalledDevicesByProject({ companyId, projectId });
      setDevices(rows);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudieron cargar los dispositivos instalados.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [companyId, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const installedCount = useMemo(() => devices.length, [devices.length]);

  const syncFromLayout = useCallback(
    async (input: { layout: SurveyLayout; siteId: string; zoneId?: string | null }): Promise<boolean> => {
      if (!companyId || !projectId) return false;
      if (!input.siteId) return false;

      const layoutDevices = input.layout?.devices ?? [];
      const candidates = layoutDevices
        .filter((device) => (input.zoneId ? device.zoneId === input.zoneId : Boolean(device.zoneId)))
        .filter((device) => Boolean(device.deviceId) && Boolean(device.id) && Boolean(device.zoneId))
        .map((device) => ({
          sourceLayoutDeviceId: device.id,
          zoneId: device.zoneId as string,
          catalogDeviceId: device.deviceId,
          locationDetail: device.label?.trim() ? device.label.trim() : null,
        }));

      setSyncing(true);
      try {
        const result = await upsertInstalledDevicesFromLayout({
          companyId,
          projectId,
          siteId: input.siteId,
          userId: installedBy,
          rows: candidates,
        });

        notifications.success({
          title: "Dispositivos sincronizados",
          description: `${result.insertedOrUpdated} dispositivos cargados desde el plano.`,
        });
        await load();
        return true;
      } catch (err) {
        notifications.error({
          title: "Error sincronizando",
          description: err instanceof Error ? err.message : "No se pudo sincronizar los dispositivos instalados.",
        });
        return false;
      } finally {
        setSyncing(false);
      }
    },
    [companyId, projectId, installedBy, load]
  );

  return {
    canLoad,
    loading,
    error,
    devices,
    installedCount,
    syncing,
    reload: load,
    syncFromLayout,
  };
}
