import { useCallback, useEffect, useMemo, useState } from "react";
import { PERMISSIONS } from "../constants/permissions";
import useAuth from "./useAuth";
import { notifications } from "../services/notification.service";
import {
  createProtocol,
  deleteProtocol,
  getProtocolsByCompany,
  updateProtocol,
} from "../services/device.service";
import type { Protocol } from "../types/Device";

const useSettingsProtocols = () => {
  const { companyProfile, canAccess } = useAuth();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<Protocol | null>(null);
  const [protocolToDelete, setProtocolToDelete] = useState<Protocol | null>(null);
  const [protocolName, setProtocolName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const companyId = companyProfile?.id ?? null;
  const canCreate = canAccess(PERMISSIONS.settingsProtocolsCreate);
  const canUpdate = canAccess(PERMISSIONS.settingsProtocolsUpdate);
  const canDelete = canAccess(PERMISSIONS.settingsProtocolsDelete);

  const loadProtocols = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProtocolsByCompany(companyId);
      setProtocols(data);
    } catch (error) {
      notifications.error({
        title: "Error cargando protocolos",
        description: "No se pudieron obtener los protocolos.",
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadProtocols();
  }, [loadProtocols]);

  const hasChanges = useMemo(() => {
    if (!editingProtocol) return Boolean(protocolName.trim());
    return protocolName.trim() !== (editingProtocol.name ?? "").trim();
  }, [editingProtocol, protocolName]);

  const filteredProtocols = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return protocols;

    return protocols.filter((protocol) => (protocol.name ?? "").toLowerCase().includes(query));
  }, [protocols, searchTerm]);

  const openCreateModal = () => {
    setEditingProtocol(null);
    setProtocolName("");
    setIsModalOpen(true);
  };

  const openEditModal = (protocol: Protocol) => {
    setEditingProtocol(protocol);
    setProtocolName(protocol.name ?? "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setEditingProtocol(null);
    setProtocolName("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanName = protocolName.trim();

    if (!cleanName) return;
    if (!companyId && !editingProtocol) {
      notifications.warning({
        title: "Compania requerida",
        description: "No se puede crear un protocolo sin compania asignada.",
      });
      return;
    }

    setSubmitting(true);
    try {
      if (editingProtocol) {
        const updated = await updateProtocol({
          id: editingProtocol.id,
          name: cleanName,
        });

        setProtocols((current) =>
          current
            .map((item) => (item.id === updated.id ? updated : item))
            .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
        );

        notifications.success({
          title: "Protocolo actualizado",
          description: "Los cambios fueron guardados correctamente.",
        });
      } else {
        const created = await createProtocol({
          name: cleanName,
          companyId: companyId as string,
        });

        setProtocols((current) =>
          [...current, created].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
        );

        notifications.success({
          title: "Protocolo creado",
          description: "El protocolo fue creado correctamente.",
        });
      }

      closeModal();
    } catch (error) {
      notifications.error({
        title: editingProtocol ? "Error actualizando protocolo" : "Error creando protocolo",
        description: "No se pudieron guardar los cambios.",
      });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const askDeleteProtocol = (protocol: Protocol) => {
    setProtocolToDelete(protocol);
  };

  const cancelDeleteProtocol = () => {
    if (submitting) return;
    setProtocolToDelete(null);
  };

  const confirmDeleteProtocol = async () => {
    if (!protocolToDelete) return;
    setSubmitting(true);
    try {
      await deleteProtocol(protocolToDelete.id);
      setProtocols((current) => current.filter((item) => item.id !== protocolToDelete.id));
      setProtocolToDelete(null);
      notifications.success({
        title: "Protocolo eliminado",
        description: "El protocolo fue eliminado.",
      });
    } catch (error) {
      notifications.error({
        title: "Error eliminando protocolo",
        description: "No se pudo eliminar el protocolo.",
      });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    protocols,
    loading,
    submitting,
    isModalOpen,
    editingProtocol,
    protocolName,
    searchTerm,
    protocolToDelete,
    filteredProtocols,
    hasChanges,
    companyId,
    canCreate,
    canUpdate,
    canDelete,
    setProtocolName,
    setSearchTerm,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    askDeleteProtocol,
    cancelDeleteProtocol,
    confirmDeleteProtocol,
  };
};

export default useSettingsProtocols;
