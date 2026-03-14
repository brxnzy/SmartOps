import { useCallback, useEffect, useMemo, useState } from "react";
import { PERMISSIONS } from "../constants/permissions";
import useAuth from "./useAuth";
import { getDevicesByCompany } from "../services/device.service";
import {
  createAutomationKit,
  deleteAutomationKit,
  getAutomationKitsByCompany,
  updateAutomationKit,
} from "../services/automationKits.service";
import { notifications } from "../services/notification.service";
import type { Device } from "../types/Device";
import type { AutomationKit, AutomationKitItemInput } from "../types/automationKit.types";

const useAutomationKits = () => {
  const { companyProfile, canAccess } = useAuth();
  const [kits, setKits] = useState<AutomationKit[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKit, setEditingKit] = useState<AutomationKit | null>(null);
  const [kitToDelete, setKitToDelete] = useState<AutomationKit | null>(null);
  const [name, setName] = useState("");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [items, setItems] = useState<AutomationKitItemInput[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const companyId = companyProfile?.id ?? null;
  const canCreate = canAccess(PERMISSIONS.kitsCreate);
  const canUpdate = canAccess(PERMISSIONS.kitsUpdate);
  const canDelete = canAccess(PERMISSIONS.kitsDelete);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [loadedKits, loadedDevices] = await Promise.all([
        getAutomationKitsByCompany(companyId),
        getDevicesByCompany(companyId),
      ]);
      setKits(loadedKits);
      setDevices(loadedDevices);
    } catch (error) {
      notifications.error({
        title: "Error cargando kits",
        description: "No se pudo obtener el catalogo de kits.",
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const deviceById = useMemo(() => new Map(devices.map((device) => [device.id, device])), [devices]);

  const filteredKits = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return kits;

    return kits.filter((kit) => {
      const itemsText = kit.items.map((item) => `${item.deviceName} ${item.deviceModel}`).join(" ");
      return `${kit.name} ${itemsText}`.toLowerCase().includes(query);
    });
  }, [kits, searchTerm]);

  const normalizedItems = useMemo(
    () =>
      items.map((item) => {
        const device = deviceById.get(item.deviceId);
        const price = Number(device?.price ?? 0);
        return {
          ...item,
          deviceName: device?.name ?? "Dispositivo",
          deviceModel: device?.model ?? "N/A",
          unitPrice: Number.isNaN(price) ? 0 : price,
        };
      }),
    [deviceById, items]
  );

  const subtotal = useMemo(
    () => normalizedItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0),
    [normalizedItems]
  );

  const discountValue = useMemo(() => {
    const percent = Number(discountPercent);
    if (Number.isNaN(percent) || percent <= 0) return 0;
    return (subtotal * Math.min(percent, 100)) / 100;
  }, [discountPercent, subtotal]);

  const total = useMemo(() => Math.max(0, subtotal - discountValue), [discountValue, subtotal]);

  const hasChanges = useMemo(() => {
    if (!name.trim() || items.length === 0) return false;
    if (!editingKit) return true;

    const cleanDiscount = Number(discountPercent);
    const currentDiscount = Number(editingKit.discountPercent ?? 0);
    const sameName = name.trim() === editingKit.name.trim();
    const sameDiscount = Number.isNaN(cleanDiscount) ? currentDiscount === 0 : cleanDiscount === currentDiscount;
    const sameItems =
      items.length === editingKit.items.length &&
      items.every((item) => {
        const match = editingKit.items.find((existing) => existing.deviceId === item.deviceId);
        return match && match.quantity === item.quantity;
      });

    return !(sameName && sameDiscount && sameItems);
  }, [discountPercent, editingKit, items, name]);

  const openCreateModal = () => {
    setEditingKit(null);
    setName("");
    setDiscountPercent("0");
    setSelectedDeviceId("");
    setItems([]);
    setIsModalOpen(true);
  };

  const openEditModal = (kit: AutomationKit) => {
    setEditingKit(kit);
    setName(kit.name);
    setDiscountPercent(String(kit.discountPercent ?? 0));
    setSelectedDeviceId("");
    setItems(kit.items.map((item) => ({ deviceId: item.deviceId, quantity: item.quantity })));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setEditingKit(null);
    setName("");
    setDiscountPercent("0");
    setSelectedDeviceId("");
    setItems([]);
  };

  const addItem = () => {
    if (!selectedDeviceId) return;
    setItems((current) => {
      const existing = current.find((item) => item.deviceId === selectedDeviceId);
      if (!existing) {
        return [...current, { deviceId: selectedDeviceId, quantity: 1 }];
      }
      return current.map((item) =>
        item.deviceId === selectedDeviceId ? { ...item, quantity: item.quantity + 1 } : item
      );
    });
    setSelectedDeviceId("");
  };

  const incrementItem = (deviceId: string) => {
    setItems((current) =>
      current.map((item) => (item.deviceId === deviceId ? { ...item, quantity: item.quantity + 1 } : item))
    );
  };

  const decrementItem = (deviceId: string) => {
    setItems((current) =>
      current
        .map((item) =>
          item.deviceId === deviceId ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (deviceId: string) => {
    setItems((current) => current.filter((item) => item.deviceId !== deviceId));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim() || items.length === 0) {
      notifications.warning({
        title: "Datos incompletos",
        description: "Indica el nombre del kit y agrega al menos un dispositivo.",
      });
      return;
    }

    const cleanDiscount = Number(discountPercent);
    if (Number.isNaN(cleanDiscount) || cleanDiscount < 0 || cleanDiscount > 100) {
      notifications.warning({
        title: "Descuento invalido",
        description: "El descuento debe estar entre 0 y 100.",
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
      const payload = {
        name: name.trim(),
        discountPercent: cleanDiscount,
        items,
      };

      if (editingKit) {
        await updateAutomationKit(editingKit.id, payload);
        notifications.success({
          title: "Kit actualizado",
          description: "El kit se actualizo correctamente.",
        });
      } else {
        await createAutomationKit(companyId, payload);
        notifications.success({
          title: "Kit creado",
          description: "El kit se creo correctamente.",
        });
      }

      await loadData();
      closeModal();
    } catch (error) {
      notifications.error({
        title: "Operacion fallida",
        description: error instanceof Error ? error.message : "No se pudo guardar el kit.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const askDeleteKit = (kit: AutomationKit) => {
    setKitToDelete(kit);
  };

  const cancelDeleteKit = () => {
    if (submitting) return;
    setKitToDelete(null);
  };

  const confirmDeleteKit = async () => {
    if (!kitToDelete) return;
    setSubmitting(true);
    try {
      await deleteAutomationKit(kitToDelete.id);
      notifications.success({
        title: "Kit eliminado",
        description: "El kit fue eliminado correctamente.",
      });
      await loadData();
      setKitToDelete(null);
    } catch (error) {
      notifications.error({
        title: "No se pudo eliminar",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return {
    loading,
    submitting,
    isModalOpen,
    editingKit,
    kitToDelete,
    name,
    discountPercent,
    selectedDeviceId,
    items: normalizedItems,
    searchTerm,
    filteredKits,
    devices,
    companyId,
    canCreate,
    canUpdate,
    canDelete,
    subtotal,
    discountValue,
    total,
    hasChanges,
    setName,
    setDiscountPercent,
    setSelectedDeviceId,
    setSearchTerm,
    openCreateModal,
    openEditModal,
    closeModal,
    addItem,
    incrementItem,
    decrementItem,
    removeItem,
    handleSubmit,
    askDeleteKit,
    cancelDeleteKit,
    confirmDeleteKit,
  };
};

export default useAutomationKits;
