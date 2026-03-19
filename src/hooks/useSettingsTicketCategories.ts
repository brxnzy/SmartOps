import { useCallback, useEffect, useMemo, useState } from "react";
import { PERMISSIONS } from "../constants/permissions";
import useAuth from "./useAuth";
import {
  createTicketCategory,
  deleteTicketCategory,
  listTicketCategories,
  updateTicketCategory,
} from "../services/ticketCategories.service";
import { notifications } from "../services/notification.service";
import type { TicketCategoryItem } from "../types/ticketing.types";

const useSettingsTicketCategories = () => {
  const { companyProfile, canAccess } = useAuth();
  const companyId = companyProfile?.id ?? null;
  const [categories, setCategories] = useState<TicketCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TicketCategoryItem | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<TicketCategoryItem | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const canCreate = canAccess(PERMISSIONS.settingsTicketCategoriesCreate);
  const canUpdate = canAccess(PERMISSIONS.settingsTicketCategoriesUpdate);
  const canDelete = canAccess(PERMISSIONS.settingsTicketCategoriesDelete);

  const loadCategories = useCallback(async () => {
    if (!companyId) {
      setCategories([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await listTicketCategories(companyId);
      setCategories(data);
    } catch (error) {
      notifications.error({
        title: "Error cargando categorias",
        description: "No se pudieron obtener las categorias de tickets.",
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const filteredCategories = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        (item.description ?? "").toLowerCase().includes(query)
    );
  }, [categories, searchTerm]);

  const hasChanges = useMemo(() => {
    const cleanName = name.trim();
    const cleanDescription = description.trim();
    if (!editingCategory) return Boolean(cleanName);

    return (
      cleanName !== editingCategory.name.trim() ||
      cleanDescription !== (editingCategory.description ?? "").trim()
    );
  }, [description, editingCategory, name]);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName("");
    setDescription("");
    setIsModalOpen(true);
  };

  const openEditModal = (category: TicketCategoryItem) => {
    setEditingCategory(category);
    setName(category.name);
    setDescription(category.description ?? "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setEditingCategory(null);
    setName("");
    setDescription("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanDescription = description.trim();
    if (!cleanName) return;
    if (!companyId && !editingCategory) {
      notifications.warning({
        title: "Compania requerida",
        description: "No se puede crear una categoria sin compania asignada.",
      });
      return;
    }

    setSubmitting(true);
    try {
      if (editingCategory) {
        const updated = await updateTicketCategory({
          id: editingCategory.id,
          name: cleanName,
          description: cleanDescription || null,
        });
        setCategories((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        notifications.success({
          title: "Categoria actualizada",
          description: "Los cambios se guardaron correctamente.",
        });
      } else {
        const created = await createTicketCategory({
          companyId: companyId as string,
          name: cleanName,
          description: cleanDescription || null,
        });
        setCategories((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
        notifications.success({
          title: "Categoria creada",
          description: "La categoria fue creada correctamente.",
        });
      }
      closeModal();
    } catch (error) {
      notifications.error({
        title: editingCategory ? "Error actualizando categoria" : "Error creando categoria",
        description: "No se pudieron guardar los cambios.",
      });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const askDeleteCategory = (category: TicketCategoryItem) => {
    setCategoryToDelete(category);
  };

  const cancelDeleteCategory = () => {
    if (submitting) return;
    setCategoryToDelete(null);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setSubmitting(true);
    try {
      await deleteTicketCategory(categoryToDelete.id);
      setCategories((current) => current.filter((item) => item.id !== categoryToDelete.id));
      setCategoryToDelete(null);
      notifications.success({
        title: "Categoria eliminada",
        description: "La categoria fue eliminada.",
      });
    } catch (error) {
      notifications.error({
        title: "Error eliminando categoria",
        description: "No se pudo eliminar la categoria.",
      });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    categories,
    loading,
    submitting,
    isModalOpen,
    editingCategory,
    name,
    description,
    searchTerm,
    categoryToDelete,
    filteredCategories,
    hasChanges,
    companyId,
    canCreate,
    canUpdate,
    canDelete,
    setName,
    setDescription,
    setSearchTerm,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    askDeleteCategory,
    cancelDeleteCategory,
    confirmDeleteCategory,
  };
};

export default useSettingsTicketCategories;
