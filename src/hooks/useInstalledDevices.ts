import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CreateInstalledDeviceInput,
  InstalledDeviceListItem,
  InstalledDeviceStatus,
  UpdateInstalledDeviceInput,
} from "../types/installedDevice.types";
import {
  createInstalledDevice,
  listInstalledDevicesByProject,
  softDeleteInstalledDevice,
  updateInstalledDevice,
  updateInstalledDeviceStatus,
} from "../services/installedDevices.service";
import { notifications } from "../services/notification.service";

type UseInstalledDevicesParams = {
  companyId: string | null;
  projectId: string | null;
  installedBy: string | null;
};

export default function useInstalledDevices({ companyId, projectId, installedBy }: UseInstalledDevicesParams) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<InstalledDeviceListItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const registerDevice = useCallback(
    async (
      draft: Omit<CreateInstalledDeviceInput, "companyId" | "projectId" | "installedBy"> & { installedBy?: string | null }
    ): Promise<boolean> => {
      if (!companyId || !projectId) return false;
      setCreating(true);
      try {
        await createInstalledDevice({
          companyId,
          projectId,
          siteId: draft.siteId,
          zoneId: draft.zoneId,
          catalogDeviceId: draft.catalogDeviceId,
          serial: draft.serial ?? null,
          mac: draft.mac ?? null,
          firmware: draft.firmware ?? null,
          locationDetail: draft.locationDetail ?? null,
          installedAt: draft.installedAt ?? null,
          installedBy: draft.installedBy ?? installedBy ?? null,
          status: draft.status,
        });
        notifications.success({
          title: "Dispositivo registrado",
          description: "El dispositivo instalado fue registrado correctamente.",
        });
        await load();
        return true;
      } catch (err) {
        notifications.error({
          title: "Error registrando dispositivo",
          description: err instanceof Error ? err.message : "No se pudo registrar el dispositivo instalado.",
        });
        return false;
      } finally {
        setCreating(false);
      }
    },
    [companyId, projectId, installedBy, load]
  );

  const editDevice = useCallback(
    async (deviceId: string, patch: Partial<UpdateInstalledDeviceInput>): Promise<boolean> => {
      if (!companyId) return false;
      setSavingId(deviceId);
      try {
        await updateInstalledDevice({ companyId, deviceId, patch });
        notifications.success({
          title: "Dispositivo actualizado",
          description: "Los cambios fueron guardados.",
        });
        await load();
        return true;
      } catch (err) {
        notifications.error({
          title: "Error actualizando dispositivo",
          description: err instanceof Error ? err.message : "No se pudo actualizar el dispositivo.",
        });
        return false;
      } finally {
        setSavingId(null);
      }
    },
    [companyId, load]
  );

  const changeStatus = useCallback(
    async (deviceId: string, status: InstalledDeviceStatus): Promise<boolean> => {
      if (!companyId) return false;
      setSavingId(deviceId);
      try {
        await updateInstalledDeviceStatus({ companyId, deviceId, status });
        notifications.success({
          title: "Estado actualizado",
          description: "El estado del dispositivo fue actualizado.",
        });
        await load();
        return true;
      } catch (err) {
        notifications.error({
          title: "Error actualizando estado",
          description: err instanceof Error ? err.message : "No se pudo actualizar el estado.",
        });
        return false;
      } finally {
        setSavingId(null);
      }
    },
    [companyId, load]
  );

  const removeDevice = useCallback(
    async (deviceId: string): Promise<boolean> => {
      if (!companyId) return false;
      setDeletingId(deviceId);
      try {
        await softDeleteInstalledDevice({ companyId, deviceId, deletedBy: installedBy });
        notifications.success({
          title: "Dispositivo eliminado",
          description: "El registro fue removido (soft delete).",
        });
        await load();
        return true;
      } catch (err) {
        notifications.error({
          title: "Error eliminando dispositivo",
          description: err instanceof Error ? err.message : "No se pudo eliminar el dispositivo.",
        });
        return false;
      } finally {
        setDeletingId(null);
      }
    },
    [companyId, installedBy, load]
  );

  return {
    canLoad,
    loading,
    error,
    devices,
    installedCount,
    creating,
    savingId,
    deletingId,
    reload: load,
    registerDevice,
    editDevice,
    changeStatus,
    removeDevice,
  };
}
