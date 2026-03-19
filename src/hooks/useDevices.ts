import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../libs/supabase";
import { PERMISSIONS } from "../constants/permissions";
import useAuth from "./useAuth";
import {
  createDeviceInventory,
  createDevice,
  deleteDevice,
  getBrandsByCompany,
  getDeviceInventoryByCompany,
  getDevicesByCompany,
  getDeviceTypesByCompany,
  getProtocolsByCompany,
  updateDevice,
} from "../services/device.service";
import { notifications } from "../services/notification.service";
import type { Brand, Device, DeviceType, Protocol } from "../types/Device";
import type { DeviceInventory } from "../types/Device";

type DeviceInventoryRealtimeRow = {
  id: string;
  device_id: string;
  quantity: number;
  status: string | null;
  last_updated: string | null;
};

const useDevices = () => {
  const { companyProfile, canAccess } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [inventory, setInventory] = useState<DeviceInventory[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
  const [name, setName] = useState("");
  const [model, setModel] = useState("");
  const [price, setPrice] = useState("");
  const [compatibility, setCompatibility] = useState("");
  const [quantity, setQuantity] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [protocolId, setProtocolId] = useState("");
  const [deviceTypeId, setDeviceTypeId] = useState("");
  const [brandId, setBrandId] = useState("");

  const companyId = companyProfile?.id ?? null;
  const canCreate = canAccess(PERMISSIONS.devicesCreate);
  const canUpdate = canAccess(PERMISSIONS.devicesUpdate);
  const canDelete = canAccess(PERMISSIONS.devicesDelete);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [loadedDevices, loadedProtocols, loadedDeviceTypes, loadedBrands, loadedInventory] =
        await Promise.all([
          getDevicesByCompany(companyId),
          getProtocolsByCompany(companyId),
          getDeviceTypesByCompany(companyId),
          getBrandsByCompany(companyId),
          getDeviceInventoryByCompany(companyId),
        ]);

      setDevices(loadedDevices);
      setProtocols(loadedProtocols);
      setDeviceTypes(loadedDeviceTypes);
      setBrands(loadedBrands);
      setInventory(loadedInventory);
    } catch (error) {
      notifications.error({
        title: "Error cargando dispositivos",
        description: "No se pudieron obtener los dispositivos y catalogos relacionados.",
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel("device-inventory")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "device_inventory" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as DeviceInventoryRealtimeRow | null;
            if (!oldRow?.id) return;
            setInventory((current) => current.filter((item) => item.id !== oldRow.id));
            return;
          }

          const row = payload.new as DeviceInventoryRealtimeRow | null;
          if (!row?.id || !row.device_id) return;

          setInventory((current) => {
            const next = current.filter((item) => item.id !== row.id);
            next.push({
              id: row.id,
              deviceId: row.device_id,
              quantity: row.quantity ?? 0,
              status: row.status ?? null,
              lastUpdated: row.last_updated ?? null,
              device: null,
            });
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  const protocolNameById = useMemo(
    () => new Map(protocols.map((protocol) => [String(protocol.id), protocol.name ?? "(Sin nombre)"])),
    [protocols]
  );

  const deviceTypeNameById = useMemo(
    () => new Map(deviceTypes.map((deviceType) => [String(deviceType.id), deviceType.name])),
    [deviceTypes]
  );

  const brandNameById = useMemo(
    () => new Map(brands.map((brand) => [brand.id, brand.name])),
    [brands]
  );

  const inventoryQuantityByDeviceId = useMemo(
    () => new Map(inventory.map((item) => [item.deviceId, item.quantity])),
    [inventory]
  );
  const filteredDevices = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return devices;

    return devices.filter((device) => {
      const protocolName = (protocolNameById.get(device.protocolId) ?? "").toLowerCase();
      const deviceTypeName = (deviceTypeNameById.get(device.deviceTypeId) ?? "").toLowerCase();
      const brandName = (brandNameById.get(device.brandId) ?? "").toLowerCase();

      return (
        device.name.toLowerCase().includes(query) ||
        device.model.toLowerCase().includes(query) ||
        (device.compatibility ?? "").toLowerCase().includes(query) ||
        protocolName.includes(query) ||
        deviceTypeName.includes(query) ||
        brandName.includes(query) ||
        String(inventoryQuantityByDeviceId.get(device.id) ?? 0).includes(query)
      );
    });
  }, [brandNameById, deviceTypeNameById, devices, protocolNameById, searchTerm, inventoryQuantityByDeviceId]);

  const hasChanges = useMemo(() => {
    const cleanName = name.trim();
    const cleanModel = model.trim();
    const cleanPrice = Number(price);
    const cleanQuantity = Number(quantity);
    const cleanCompatibility = compatibility.trim();

    if (!editingDevice) {
      return Boolean(
        cleanName &&
          cleanModel &&
          price.trim() &&
          !Number.isNaN(cleanPrice) &&
          quantity.trim() &&
          !Number.isNaN(cleanQuantity) &&
          cleanQuantity >= 0 &&
          protocolId &&
          deviceTypeId &&
          brandId
      );
    }

    return (
      cleanName !== editingDevice.name.trim() ||
      cleanModel !== editingDevice.model.trim() ||
      cleanPrice !== editingDevice.price ||
      cleanCompatibility !== (editingDevice.compatibility ?? "").trim() ||
      protocolId !== editingDevice.protocolId ||
      deviceTypeId !== editingDevice.deviceTypeId ||
      brandId !== editingDevice.brandId
    );
  }, [brandId, compatibility, deviceTypeId, editingDevice, model, name, price, protocolId, quantity]);

  const openCreateModal = () => {
    setEditingDevice(null);
    setName("");
    setModel("");
    setPrice("");
    setCompatibility("");
    setQuantity("");
    setProtocolId("");
    setDeviceTypeId("");
    setBrandId("");
    setIsModalOpen(true);
  };

  const openEditModal = (device: Device) => {
    setEditingDevice(device);
    setName(device.name);
    setModel(device.model);
    setPrice(String(device.price));
    setCompatibility(device.compatibility ?? "");
    setQuantity("");
    setProtocolId(device.protocolId);
    setDeviceTypeId(device.deviceTypeId);
    setBrandId(device.brandId);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setEditingDevice(null);
    setName("");
    setModel("");
    setPrice("");
    setCompatibility("");
    setQuantity("");
    setProtocolId("");
    setDeviceTypeId("");
    setBrandId("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanName = name.trim();
    const cleanModel = model.trim();
    const cleanPrice = Number(price);
    const cleanQuantity = Number(quantity);
    const cleanCompatibility = compatibility.trim();

    const invalidBaseFields =
      !cleanName || !cleanModel || !price.trim() || Number.isNaN(cleanPrice) || cleanPrice < 0;
    const invalidQuantity = !quantity.trim() || Number.isNaN(cleanQuantity) || cleanQuantity < 0;

    if (invalidBaseFields || (!editingDevice && invalidQuantity)) {
      notifications.warning({
        title: "Datos invalidos",
        description: editingDevice
          ? "Nombre, modelo y precio valido son obligatorios."
          : "Nombre, modelo, precio y cantidad valida son obligatorios.",
      });
      return;
    }

    if (!protocolId || !deviceTypeId || !brandId) {
      notifications.warning({
        title: "Catalogos requeridos",
        description: "Selecciona protocolo, tipo de dispositivo y marca.",
      });
      return;
    }

    if (!companyId && !editingDevice) {
      notifications.warning({
        title: "Compania requerida",
        description: "No se puede crear un dispositivo sin compania asignada.",
      });
      return;
    }

    setSubmitting(true);
    try {
      if (editingDevice) {
        const updated = await updateDevice({
          id: editingDevice.id,
          name: cleanName,
          model: cleanModel,
          price: cleanPrice,
          protocolId,
          deviceTypeId,
          brandId,
          compatibility: cleanCompatibility || null,
        });

        setDevices((current) => current.map((item) => (item.id === updated.id ? updated : item)));

        notifications.success({
          title: "Dispositivo actualizado",
          description: "Los cambios fueron guardados correctamente.",
        });
      } else {
        const created = await createDevice({
          name: cleanName,
          model: cleanModel,
          price: cleanPrice,
          protocolId,
          deviceTypeId,
          companyId: companyId as string,
          brandId,
          compatibility: cleanCompatibility || null,
        });

        await createDeviceInventory({
          deviceId: created.id,
          quantity: cleanQuantity,
          status: cleanQuantity > 0 ? "available" : "out_of_stock",
        });

        setDevices((current) => [created, ...current]);

        notifications.success({
          title: "Dispositivo creado",
          description: "El dispositivo fue creado correctamente.",
        });
      }

      closeModal();
    } catch (error) {
      notifications.error({
        title: editingDevice ? "Error actualizando dispositivo" : "Error creando dispositivo",
        description: "No se pudieron guardar los cambios.",
      });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const askDeleteDevice = (device: Device) => {
    setDeviceToDelete(device);
  };

  const cancelDeleteDevice = () => {
    if (submitting) return;
    setDeviceToDelete(null);
  };

  const confirmDeleteDevice = async () => {
    if (!deviceToDelete) return;

    setSubmitting(true);
    try {
      await deleteDevice(deviceToDelete.id);
      setDevices((current) => current.filter((item) => item.id !== deviceToDelete.id));
      setDeviceToDelete(null);
      notifications.success({
        title: "Dispositivo eliminado",
        description: "El dispositivo fue eliminado.",
      });
    } catch (error) {
      notifications.error({
        title: "Error eliminando dispositivo",
        description: "No se pudo eliminar el dispositivo.",
      });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    devices,
    protocols,
    deviceTypes,
    brands,
    loading,
    submitting,
    isModalOpen,
    editingDevice,
    deviceToDelete,
    name,
    model,
    price,
    compatibility,
    quantity,
    searchTerm,
    protocolId,
    deviceTypeId,
    brandId,
    hasChanges,
    filteredDevices,
    companyId,
    canCreate,
    canUpdate,
    canDelete,
    protocolNameById,
    deviceTypeNameById,
    brandNameById,
    inventoryQuantityByDeviceId,
    setName,
    setModel,
    setPrice,
    setCompatibility,
    setQuantity,
    setSearchTerm,
    setProtocolId,
    setDeviceTypeId,
    setBrandId,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    askDeleteDevice,
    cancelDeleteDevice,
    confirmDeleteDevice,
  };
};

export default useDevices;
