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
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
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
      return `${kit.name} ${kit.description} ${itemsText}`.toLowerCase().includes(query);
    });
  }, [kits, searchTerm]);

  const normalizedItems = useMemo(
    () =>
      items.map((item) => {
        const device = deviceById.get(item.deviceId);
        const priceValue = Number(device?.price ?? 0);
        return {
          ...item,
          deviceName: device?.name ?? "Dispositivo",
          deviceModel: device?.model ?? "N/A",
          unitPrice: Number.isNaN(priceValue) ? 0 : priceValue,
        };
      }),
    [deviceById, items]
  );

  const subtotal = useMemo(
    () => normalizedItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0),
    [normalizedItems]
  );

  const hasChanges = useMemo(() => {
    const cleanName = name.trim();
    const cleanDescription = description.trim();
    const cleanPrice = Number(price);

    if (!cleanName || !cleanDescription || items.length === 0) return false;
    if (!price.trim() || Number.isNaN(cleanPrice) || cleanPrice < 0) return false;
    if (!editingKit) return true;

    const sameName = cleanName === editingKit.name.trim();
    const sameDescription = cleanDescription === (editingKit.description ?? "").trim();
    const samePrice = cleanPrice === Number(editingKit.price ?? 0);
    const sameItems =
      items.length === editingKit.items.length &&
      items.every((item) => {
        const match = editingKit.items.find((existing) => existing.deviceId === item.deviceId);
        return match && match.quantity === item.quantity;
      });

    return !(sameName && sameDescription && samePrice && sameItems);
  }, [description, editingKit, items, name, price]);

  const openCreateModal = () => {
    setEditingKit(null);
    setName("");
    setDescription("");
    setPrice("");
    setItems([]);
    setIsModalOpen(true);
  };

  const openEditModal = (kit: AutomationKit) => {
    setEditingKit(kit);
    setName(kit.name);
    setDescription(kit.description ?? "");
    setPrice(String(kit.price ?? 0));
    setItems(kit.items.map((item) => ({ deviceId: item.deviceId, quantity: item.quantity })));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setEditingKit(null);
    setName("");
    setDescription("");
    setPrice("");
    setItems([]);
  };

  const setItemsBulk = (nextItems: AutomationKitItemInput[]) => {
    setItems(nextItems);
  };

  const removeItem = (deviceId: string) => {
    setItems((current) => current.filter((item) => item.deviceId !== deviceId));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanName = name.trim();
    const cleanDescription = description.trim();
    const cleanPrice = Number(price);

    if (!cleanName || !cleanDescription || items.length === 0) {
      notifications.warning({
        title: "Datos incompletos",
        description: "Indica nombre, descripcion y agrega al menos un dispositivo.",
      });
      return;
    }

    if (!price.trim() || Number.isNaN(cleanPrice) || cleanPrice < 0) {
      notifications.warning({
        title: "Precio invalido",
        description: "Indica un precio valido para el kit.",
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
        name: cleanName,
        description: cleanDescription,
        price: cleanPrice,
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
    description,
    price,
    items: normalizedItems,
    searchTerm,
    filteredKits,
    devices,
    companyId,
    canCreate,
    canUpdate,
    canDelete,
    subtotal,
    hasChanges,
    setName,
    setDescription,
    setPrice,
    setSearchTerm,
    setItemsBulk,
    removeItem,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    askDeleteKit,
    cancelDeleteKit,
    confirmDeleteKit,
  };
};

export default useAutomationKits;
