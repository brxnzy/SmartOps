import { useCallback, useEffect, useMemo, useState } from "react";
import { PERMISSIONS } from "../constants/permissions";
import useAuth from "./useAuth";
import {
  createDeviceType,
  deleteDeviceType,
  getDeviceTypesByCompany,
  updateDeviceType,
} from "../services/device.service";
import { notifications } from "../services/notification.service";
import type { DeviceType } from "../types/Device";

const useSettingsDeviceTypes = () => {
  const { companyProfile, canAccess } = useAuth();
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeviceType, setEditingDeviceType] = useState<DeviceType | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const companyId = companyProfile?.id ?? null;
  const canCreate = canAccess(PERMISSIONS.settingsDeviceTypesCreate);
  const canUpdate = canAccess(PERMISSIONS.settingsDeviceTypesUpdate);
  const canDelete = canAccess(PERMISSIONS.settingsDeviceTypesDelete);

  const loadDeviceTypes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDeviceTypesByCompany(companyId);
      setDeviceTypes(data);
    } catch (error) {
      notifications.error({
        title: "Error cargando tipos de dispositivos",
        description: "No se pudieron obtener los tipos de dispositivos.",
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadDeviceTypes();
  }, [loadDeviceTypes]);

  const hasChanges = useMemo(() => {
    const cleanName = name.trim();
    const cleanDescription = description.trim();

    if (!editingDeviceType) return Boolean(cleanName);

    return (
      cleanName !== editingDeviceType.name.trim() ||
      cleanDescription !== (editingDeviceType.description ?? "").trim()
    );
  }, [description, editingDeviceType, name]);

  const openCreateModal = () => {
    setEditingDeviceType(null);
    setName("");
    setDescription("");
    setIsModalOpen(true);
  };

  const openEditModal = (deviceType: DeviceType) => {
    setEditingDeviceType(deviceType);
    setName(deviceType.name);
    setDescription(deviceType.description ?? "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setEditingDeviceType(null);
    setName("");
    setDescription("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanName = name.trim();
    const cleanDescription = description.trim();

    if (!cleanName) return;
    if (!companyId && !editingDeviceType) {
      notifications.warning({
        title: "Compania requerida",
        description: "No se puede crear un tipo de dispositivo sin compania asignada.",
      });
      return;
    }

    setSubmitting(true);
    try {
      if (editingDeviceType) {
        const updated = await updateDeviceType({
          id: editingDeviceType.id,
          name: cleanName,
          description: cleanDescription || null,
        });

        setDeviceTypes((current) => current.map((item) => (item.id === updated.id ? updated : item)));

        notifications.success({
          title: "Tipo de dispositivo actualizado",
          description: "Los cambios fueron guardados correctamente.",
        });
      } else {
        const created = await createDeviceType({
          name: cleanName,
          description: cleanDescription || null,
          companyId: companyId as string,
        });

        setDeviceTypes((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));

        notifications.success({
          title: "Tipo de dispositivo creado",
          description: "El tipo de dispositivo fue creado correctamente.",
        });
      }

      closeModal();
    } catch (error) {
      notifications.error({
        title: editingDeviceType
          ? "Error actualizando tipo de dispositivo"
          : "Error creando tipo de dispositivo",
        description: "No se pudieron guardar los cambios.",
      });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (deviceType: DeviceType) => {
    const accepted = window.confirm(`Eliminar el tipo de dispositivo ${deviceType.name}?`);
    if (!accepted) return;

    setSubmitting(true);
    try {
      await deleteDeviceType(deviceType.id);
      setDeviceTypes((current) => current.filter((item) => item.id !== deviceType.id));
      notifications.success({
        title: "Tipo de dispositivo eliminado",
        description: "El tipo de dispositivo fue eliminado.",
      });
    } catch (error) {
      notifications.error({
        title: "Error eliminando tipo de dispositivo",
        description: "No se pudo eliminar el tipo de dispositivo.",
      });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    deviceTypes,
    loading,
    submitting,
    isModalOpen,
    editingDeviceType,
    name,
    description,
    hasChanges,
    companyId,
    canCreate,
    canUpdate,
    canDelete,
    setName,
    setDescription,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    handleDelete,
  };
};

export default useSettingsDeviceTypes;
