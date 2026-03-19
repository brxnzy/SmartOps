import { useCallback, useEffect, useMemo, useState } from "react";
import { PERMISSIONS } from "../constants/permissions";
import useAuth from "./useAuth";
import { getDevicesByCompany } from "../services/device.service";
import { getSuppliersByCompany } from "../services/suppliers.service";
import { createInventoryLoad, getInventoryLoadsByCompany } from "../services/inventoryLoads.service";
import { notifications } from "../services/notification.service";
import type { Device } from "../types/Device";
import type { Supplier } from "../types/supplier.types";
import type { InventoryLoad, InventoryLoadItemInput } from "../types/inventoryLoad.types";

const useInventoryLoads = () => {
  const { companyProfile, canAccess } = useAuth();
  const [loads, setLoads] = useState<InventoryLoad[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [items, setItems] = useState<InventoryLoadItemInput[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const companyId = companyProfile?.id ?? null;
  const canCreate = canAccess(PERMISSIONS.inventoryLoadsCreate);
  const canRead = canAccess(PERMISSIONS.inventoryLoadsRead);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [loadedLoads, loadedSuppliers, loadedDevices] = await Promise.all([
        getInventoryLoadsByCompany(companyId),
        getSuppliersByCompany(companyId),
        getDevicesByCompany(companyId),
      ]);
      setLoads(loadedLoads);
      setSuppliers(loadedSuppliers);
      setDevices(loadedDevices);
    } catch (error) {
      notifications.error({
        title: "Error cargando cargas",
        description: "No se pudo obtener el historial de cargas de inventario.",
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (!canRead) return;
    loadData();
  }, [canRead, loadData]);

  const supplierNameById = useMemo(
    () => new Map(suppliers.map((supplier) => [supplier.id, supplier.name])),
    [suppliers]
  );

  const deviceNameById = useMemo(
    () => new Map(devices.map((device) => [device.id, device.name])),
    [devices]
  );

  const deviceModelById = useMemo(
    () => new Map(devices.map((device) => [device.id, device.model])),
    [devices]
  );

  const filteredLoads = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return loads;

    return loads.filter((load) => {
      const itemsSearchable = load.items
        .map((item) => `${item.deviceName} ${item.deviceModel} ${item.quantity}`)
        .join(" ");
      const searchable = [load.supplierName, itemsSearchable].join(" ").toLowerCase();
      return searchable.includes(query);
    });
  }, [loads, searchTerm]);

  const hasChanges = useMemo(() => {
    return Boolean(supplierId && items.length > 0);
  }, [items.length, supplierId]);

  const addItem = () => {
    const cleanQuantity = Number(quantity);
    if (!deviceId || Number.isNaN(cleanQuantity) || cleanQuantity <= 0) return;

    setItems((current) => {
      const existingIndex = current.findIndex((item) => item.deviceId === deviceId);
      if (existingIndex === -1) {
        return [...current, { deviceId, quantity: cleanQuantity }];
      }
      const next = [...current];
      next[existingIndex] = {
        deviceId,
        quantity: next[existingIndex].quantity + cleanQuantity,
      };
      return next;
    });

    setDeviceId("");
    setQuantity("");
  };

  const setItemsBulk = (nextItems: InventoryLoadItemInput[]) => {
    setItems(nextItems);
  };

  const removeItem = (deviceIdToRemove: string) => {
    setItems((current) => current.filter((item) => item.deviceId !== deviceIdToRemove));
  };

  const openCreateModal = () => {
    setSupplierId("");
    setDeviceId("");
    setQuantity("");
    setItems([]);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setSupplierId("");
    setDeviceId("");
    setQuantity("");
    setItems([]);
  };

  const selectSupplier = (nextSupplierId: string) => {
    setSupplierId(nextSupplierId);
    setDeviceId("");
    setQuantity("");
    setItems([]);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supplierId || items.length === 0) {
      notifications.warning({
        title: "Datos incompletos",
        description: "Selecciona un proveedor y agrega al menos un producto con cantidad valida.",
      });
      return;
    }

    if (!companyId) {
      notifications.error({
        title: "Operacion no disponible",
        description: "No se encontro la compania activa.",
      });
      return;
    }

    setSubmitting(true);
    try {
      await createInventoryLoad(companyId, {
        supplierId,
        items,
      });
      notifications.success({
        title: "Carga registrada",
        description: "La entrada de inventario fue registrada correctamente.",
      });
      await loadData();
      closeModal();
    } catch (error) {
      notifications.error({
        title: "Operacion fallida",
        description: error instanceof Error ? error.message : "No se pudo registrar la carga.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return {
    loading,
    submitting,
    isModalOpen,
    supplierId,
    deviceId,
    quantity,
    items,
    searchTerm,
    filteredLoads,
    suppliers,
    devices,
    companyId,
    canCreate,
    hasChanges,
    supplierNameById,
    deviceNameById,
    deviceModelById,
    selectSupplier,
    setDeviceId,
    setQuantity,
    setSearchTerm,
    openCreateModal,
    closeModal,
    handleSubmit,
    addItem,
    removeItem,
    setItemsBulk,
  };
};

export default useInventoryLoads;
