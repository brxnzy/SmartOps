import { useCallback, useEffect, useMemo, useState } from "react";
import { PERMISSIONS } from "../constants/permissions";
import useAuth from "./useAuth";
import { notifications } from "../services/notification.service";
import {
  createChecklistItem,
  createChecklistTemplate,
  deleteChecklistItem,
  deleteChecklistTemplate,
  getChecklistItemsByTemplateIds,
  getChecklistTemplatesByCompany,
  updateChecklistItem,
  updateChecklistTemplate,
} from "../services/checklistTemplates.service";
import type { ChecklistItem, ChecklistTemplate } from "../types/Checklist";

interface ItemDeleteTarget {
  item: ChecklistItem;
  templateId: string;
}

const sortItems = (items: ChecklistItem[]) =>
  [...items].sort((a, b) => {
    if (a.itemOrder !== b.itemOrder) {
      return a.itemOrder - b.itemOrder;
    }

    return a.text.localeCompare(b.text);
  });

const groupItemsByTemplate = (items: ChecklistItem[]) => {
  const grouped: Record<string, ChecklistItem[]> = {};

  items.forEach((item) => {
    if (!grouped[item.templateId]) {
      grouped[item.templateId] = [];
    }
    grouped[item.templateId].push(item);
  });

  Object.keys(grouped).forEach((templateId) => {
    grouped[templateId] = sortItems(grouped[templateId]);
  });

  return grouped;
};

const getNextItemOrder = (items: ChecklistItem[]) => {
  if (!items.length) return 0;
  return items.reduce((max, item) => Math.max(max, item.itemOrder), -1) + 1;
};

const useSettingsChecklistTemplates = () => {
  const { companyProfile, canAccess } = useAuth();
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [itemsByTemplateId, setItemsByTemplateId] = useState<Record<string, ChecklistItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingInitialName, setEditingInitialName] = useState("");
  const [editingInitialDescription, setEditingInitialDescription] = useState("");

  const [templateToDelete, setTemplateToDelete] = useState<ChecklistTemplate | null>(null);

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemTemplateId, setItemTemplateId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [itemText, setItemText] = useState("");
  const [itemToDelete, setItemToDelete] = useState<ItemDeleteTarget | null>(null);

  const companyId = companyProfile?.id ?? null;
  const canCreateTemplate = canAccess(PERMISSIONS.settingsChecklistTemplatesCreate);
  const canUpdateTemplate = canAccess(PERMISSIONS.settingsChecklistTemplatesUpdate);
  const canDeleteTemplate = canAccess(PERMISSIONS.settingsChecklistTemplatesDelete);
  const canCreateItem = canAccess(PERMISSIONS.settingsChecklistItemsCreate);
  const canUpdateItem = canAccess(PERMISSIONS.settingsChecklistItemsUpdate);
  const canDeleteItem = canAccess(PERMISSIONS.settingsChecklistItemsDelete);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const loadedTemplates = await getChecklistTemplatesByCompany(companyId);
      const items = await getChecklistItemsByTemplateIds(loadedTemplates.map((template) => template.id));

      setTemplates(loadedTemplates);
      setItemsByTemplateId(groupItemsByTemplate(items));
    } catch (error) {
      notifications.error({
        title: "Error cargando plantillas",
        description: "No se pudieron obtener las plantillas de checklist.",
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const filteredTemplates = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return templates;

    return templates.filter((template) => template.name.toLowerCase().includes(query));
  }, [templates, searchTerm]);

  const hasEditingChanges = useMemo(() => {
    if (!editingTemplateId) return false;

    const cleanName = editingName.trim();
    const cleanDescription = editingDescription.trim();
    const initialDescription = editingInitialDescription.trim();

    return cleanName !== editingInitialName || cleanDescription !== initialDescription;
  }, [editingDescription, editingInitialDescription, editingInitialName, editingName, editingTemplateId]);

  const itemHasChanges = useMemo(() => {
    const cleanText = itemText.trim();

    if (!editingItem) return Boolean(cleanText);

    return Boolean(cleanText) && cleanText !== editingItem.text.trim();
  }, [editingItem, itemText]);

  const handleCreateTemplate = useCallback(async (): Promise<boolean> => {
    const cleanName = newTemplateName.trim();
    const cleanDescription = newTemplateDescription.trim();

    if (!cleanName) return false;

    if (!companyId) {
      notifications.warning({
        title: "Compania requerida",
        description: "No se puede crear una plantilla sin compania asignada.",
      });
      return false;
    }

    setSubmitting(true);
    try {
      const created = await createChecklistTemplate({
        companyId,
        name: cleanName,
        description: cleanDescription || null,
      });

      setTemplates((current) =>
        [...current, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      setItemsByTemplateId((current) => ({ ...current, [created.id]: [] }));
      setNewTemplateName("");
      setNewTemplateDescription("");

      notifications.success({
        title: "Plantilla creada",
        description: `La plantilla ${created.name} fue creada correctamente.`,
      });

      return true;
    } catch (error) {
      notifications.error({
        title: "Error creando plantilla",
        description: "No se pudo crear la plantilla.",
      });
      console.error(error);
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [companyId, newTemplateDescription, newTemplateName]);

  const startEditTemplate = useCallback((template: ChecklistTemplate) => {
    setEditingTemplateId(template.id);
    setEditingName(template.name);
    setEditingDescription(template.description ?? "");
    setEditingInitialName(template.name.trim());
    setEditingInitialDescription((template.description ?? "").trim());
  }, []);

  const cancelEditTemplate = useCallback(() => {
    setEditingTemplateId(null);
    setEditingName("");
    setEditingDescription("");
    setEditingInitialName("");
    setEditingInitialDescription("");
  }, []);

  const handleUpdateTemplate = useCallback(
    async (templateId: string) => {
      if (templateId !== editingTemplateId) return;

      const cleanName = editingName.trim();
      const cleanDescription = editingDescription.trim();

      if (!cleanName) return;

      const hasChanges =
        cleanName !== editingInitialName || cleanDescription !== editingInitialDescription.trim();

      if (!hasChanges) return;

      setSubmitting(true);
      try {
        const updated = await updateChecklistTemplate({
          id: templateId,
          name: cleanName,
          description: cleanDescription || null,
        });

        setTemplates((current) =>
          current
            .map((template) => (template.id === updated.id ? updated : template))
            .sort((a, b) => a.name.localeCompare(b.name))
        );

        cancelEditTemplate();

        notifications.success({
          title: "Plantilla actualizada",
          description: `Los cambios de ${updated.name} se guardaron correctamente.`,
        });
      } catch (error) {
        notifications.error({
          title: "Error actualizando plantilla",
          description: "No se pudieron guardar los cambios de la plantilla.",
        });
        console.error(error);
      } finally {
        setSubmitting(false);
      }
    },
    [
      cancelEditTemplate,
      editingDescription,
      editingInitialDescription,
      editingInitialName,
      editingName,
      editingTemplateId,
    ]
  );

  const askDeleteTemplate = useCallback((template: ChecklistTemplate) => {
    setTemplateToDelete(template);
  }, []);

  const cancelDeleteTemplate = useCallback(() => {
    if (submitting) return;
    setTemplateToDelete(null);
  }, [submitting]);

  const confirmDeleteTemplate = useCallback(async () => {
    if (!templateToDelete) return;

    setSubmitting(true);
    try {
      await deleteChecklistTemplate(templateToDelete.id);
      setTemplates((current) => current.filter((template) => template.id !== templateToDelete.id));
      setItemsByTemplateId((current) => {
        const next = { ...current };
        delete next[templateToDelete.id];
        return next;
      });
      setTemplateToDelete(null);

      notifications.success({
        title: "Plantilla eliminada",
        description: `La plantilla ${templateToDelete.name} fue eliminada.`,
      });
    } catch (error) {
      notifications.error({
        title: "Error eliminando plantilla",
        description: "No se pudo eliminar la plantilla.",
      });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  }, [templateToDelete]);

  const openCreateItem = useCallback((templateId: string) => {
    setItemTemplateId(templateId);
    setEditingItem(null);
    setItemText("");
    setIsItemModalOpen(true);
  }, []);

  const openEditItem = useCallback((templateId: string, item: ChecklistItem) => {
    setItemTemplateId(templateId);
    setEditingItem(item);
    setItemText(item.text);
    setIsItemModalOpen(true);
  }, []);

  const closeItemModal = useCallback(() => {
    if (submitting) return;
    setIsItemModalOpen(false);
    setItemTemplateId(null);
    setEditingItem(null);
    setItemText("");
  }, [submitting]);

  const handleSubmitItem = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const cleanText = itemText.trim();
      if (!cleanText || !itemTemplateId) return;

      setSubmitting(true);
      try {
        if (editingItem) {
          const updated = await updateChecklistItem({
            id: editingItem.id,
            text: cleanText,
            itemOrder: editingItem.itemOrder,
          });

          setItemsByTemplateId((current) => {
            const list = current[itemTemplateId] ?? [];
            const nextItems = sortItems(
              list.map((item) => (item.id === updated.id ? updated : item))
            );
            return { ...current, [itemTemplateId]: nextItems };
          });

          notifications.success({
            title: "Item actualizado",
            description: "El item fue actualizado correctamente.",
          });
        } else {
          const currentItems = itemsByTemplateId[itemTemplateId] ?? [];
          const created = await createChecklistItem({
            templateId: itemTemplateId,
            text: cleanText,
            itemOrder: getNextItemOrder(currentItems),
          });

          setItemsByTemplateId((current) => {
            const list = current[itemTemplateId] ?? [];
            const nextItems = sortItems([...list, created]);
            return { ...current, [itemTemplateId]: nextItems };
          });

          notifications.success({
            title: "Item creado",
            description: "El item fue agregado a la plantilla.",
          });
        }

        closeItemModal();
      } catch (error) {
        notifications.error({
          title: editingItem ? "Error actualizando item" : "Error creando item",
          description: "No se pudo guardar el item.",
        });
        console.error(error);
      } finally {
        setSubmitting(false);
      }
    },
    [closeItemModal, editingItem, itemTemplateId, itemText, itemsByTemplateId]
  );

  const askDeleteItem = useCallback((templateId: string, item: ChecklistItem) => {
    setItemToDelete({ item, templateId });
  }, []);

  const cancelDeleteItem = useCallback(() => {
    if (submitting) return;
    setItemToDelete(null);
  }, [submitting]);

  const confirmDeleteItem = useCallback(async () => {
    if (!itemToDelete) return;

    setSubmitting(true);
    try {
      await deleteChecklistItem(itemToDelete.item.id);
      setItemsByTemplateId((current) => {
        const list = current[itemToDelete.templateId] ?? [];
        const nextItems = list.filter((item) => item.id !== itemToDelete.item.id);
        return { ...current, [itemToDelete.templateId]: nextItems };
      });
      setItemToDelete(null);

      notifications.success({
        title: "Item eliminado",
        description: "El item fue eliminado de la plantilla.",
      });
    } catch (error) {
      notifications.error({
        title: "Error eliminando item",
        description: "No se pudo eliminar el item.",
      });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  }, [itemToDelete]);

  return {
    templates,
    itemsByTemplateId,
    loading,
    submitting,
    searchTerm,
    newTemplateName,
    newTemplateDescription,
    editingTemplateId,
    editingName,
    editingDescription,
    templateToDelete,
    filteredTemplates,
    hasEditingChanges,
    itemHasChanges,
    companyId,
    isItemModalOpen,
    itemTemplateId,
    editingItem,
    itemText,
    itemToDelete,
    canCreateTemplate,
    canUpdateTemplate,
    canDeleteTemplate,
    canCreateItem,
    canUpdateItem,
    canDeleteItem,
    setSearchTerm,
    setNewTemplateName,
    setNewTemplateDescription,
    setEditingName,
    setEditingDescription,
    setItemText,
    handleCreateTemplate,
    startEditTemplate,
    cancelEditTemplate,
    handleUpdateTemplate,
    askDeleteTemplate,
    cancelDeleteTemplate,
    confirmDeleteTemplate,
    openCreateItem,
    openEditItem,
    closeItemModal,
    handleSubmitItem,
    askDeleteItem,
    cancelDeleteItem,
    confirmDeleteItem,
  };
};

export default useSettingsChecklistTemplates;
