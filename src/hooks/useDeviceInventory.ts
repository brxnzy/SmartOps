import { useCallback, useEffect, useMemo, useState } from "react";
import { PERMISSIONS } from "../constants/permissions";
import useAuth from "./useAuth";
import {
  createDeviceInventory,
  getDeviceInventoryByCompany,
  getDevicesByCompany,
  updateDeviceInventory,
} from "../services/device.service";
import { notifications } from "../services/notification.service";
import type { Device, DeviceInventory } from "../types/Device";

type DeviceInventoryView = {
  device: Device;
  inventory: DeviceInventory | null;
  quantity: number;
  status: string;
};

function buildStatusFromQuantity(quantity: number): string {
  if (quantity <= 0) return "out_of_stock";
  if (quantity <= 5) return "low_stock";
  return "available";
}

const useDeviceInventory = () => {
  const { companyProfile, canAccess } = useAuth();
  const [inventory, setInventory] = useState<DeviceInventory[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingDeviceId, setSubmittingDeviceId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const companyId = companyProfile?.id ?? null;
  const canCreateInventory = canAccess(PERMISSIONS.deviceInventoryCreate);
  const canUpdateInventory = canAccess(PERMISSIONS.deviceInventoryUpdate);
  const canAdjust = canCreateInventory || canUpdateInventory;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [inventoryData, devicesData] = await Promise.all([
        getDeviceInventoryByCompany(companyId),
        getDevicesByCompany(companyId),
      ]);
      setInventory(inventoryData);
      setDevices(devicesData);
    } catch (error) {
      notifications.error({
        title: "Error cargando inventario",
        description: "No se pudo obtener el inventario de dispositivos.",
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const inventoryByDeviceId = useMemo(
    () => new Map(inventory.map((item) => [item.deviceId, item])),
    [inventory]
  );

  const inventoryRows = useMemo<DeviceInventoryView[]>(
    () =>
      devices.map((device) => {
        const item = inventoryByDeviceId.get(device.id) ?? null;
        const quantity = item?.quantity ?? 0;
        return {
          device,
          inventory: item,
          quantity,
          status: item?.status ?? buildStatusFromQuantity(quantity),
        };
      }),
    [devices, inventoryByDeviceId]
  );

  const filteredInventoryRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return inventoryRows;

    return inventoryRows.filter((row) => {
      const name = row.device.name.toLowerCase();
      const model = row.device.model.toLowerCase();
      const status = row.status.toLowerCase();
      return (
        name.includes(query) ||
        model.includes(query) ||
        status.includes(query) ||
        String(row.quantity).includes(query)
      );
    });
  }, [inventoryRows, searchTerm]);

  const applyQuantityChange = useCallback(
    async (deviceId: string, nextQuantity: number): Promise<boolean> => {
      const safeQuantity = Math.max(0, nextQuantity);
      const current = inventoryByDeviceId.get(deviceId) ?? null;
      const nextStatus = buildStatusFromQuantity(safeQuantity);

      setSubmittingDeviceId(deviceId);
      try {
        let saved: DeviceInventory;

        if (current) {
          if (!canUpdateInventory) {
            notifications.warning({
              title: "Permiso requerido",
              description: "No tienes permiso para actualizar inventario.",
            });
            return false;
          }

          saved = await updateDeviceInventory({
            id: current.id,
            deviceId,
            quantity: safeQuantity,
            status: nextStatus,
          });
        } else {
          if (!canCreateInventory) {
            notifications.warning({
              title: "Permiso requerido",
              description: "No tienes permiso para crear inventario.",
            });
            return false;
          }

          saved = await createDeviceInventory({
            deviceId,
            quantity: safeQuantity,
            status: nextStatus,
          });
        }

        setInventory((items) => {
          const exists = items.some((item) => item.id === saved.id);
          if (exists) {
            return items.map((item) => (item.id === saved.id ? saved : item));
          }
          return [saved, ...items];
        });
        return true;
      } catch (error) {
        notifications.error({
          title: "Error actualizando inventario",
          description: "No se pudo actualizar la cantidad del dispositivo.",
        });
        console.error(error);
        return false;
      } finally {
        setSubmittingDeviceId(null);
      }
    },
    [canCreateInventory, canUpdateInventory, inventoryByDeviceId]
  );

  const increaseQuantity = useCallback(
    async (deviceId: string) => {
      const current = inventoryByDeviceId.get(deviceId)?.quantity ?? 0;
      await applyQuantityChange(deviceId, current + 1);
    },
    [applyQuantityChange, inventoryByDeviceId]
  );

  const decreaseQuantity = useCallback(
    async (deviceId: string) => {
      const current = inventoryByDeviceId.get(deviceId)?.quantity ?? 0;
      if (current <= 0) return;
      await applyQuantityChange(deviceId, current - 1);
    },
    [applyQuantityChange, inventoryByDeviceId]
  );

  const setExactQuantity = useCallback(
    async (deviceId: string, quantity: number) => {
      if (Number.isNaN(quantity)) return;
      const updated = await applyQuantityChange(deviceId, quantity);
      if (updated) {
        const deviceName = devices.find((device) => device.id === deviceId)?.name ?? "dispositivo";
        notifications.success({
          title: "Inventario actualizado",
          description: `La cantidad de ${deviceName} fue actualizada correctamente.`,
        });
        await loadData();
      }
    },
    [applyQuantityChange, devices, loadData]
  );

  return {
    loading,
    searchTerm,
    filteredInventoryRows,
    canAdjust,
    submittingDeviceId,
    setSearchTerm,
    increaseQuantity,
    decreaseQuantity,
    setExactQuantity,
  };
};

export default useDeviceInventory;
