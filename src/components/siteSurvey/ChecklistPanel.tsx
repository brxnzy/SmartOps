import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import Button from "../Button";
import Input from "../Input";
import { notifications } from "../../services/notification.service";
import {
  applyChecklistTemplatesToSurvey,
  createCustomChecklistItem,
  deleteSurveyChecklistItem,
  listChecklistTemplatesForSurvey,
  updateSurveyChecklistItem,
} from "../../services/siteSurveyExecution.service";
import type {
  ChecklistTemplateOption,
  SurveyChecklistItem,
} from "../../types/siteSurveyExecution.types";

interface ChecklistPanelProps {
  surveyId: string;
  companyId: string;
  initialItems: SurveyChecklistItem[];
  onItemsChange: (items: SurveyChecklistItem[]) => void;
}

export default function ChecklistPanel({
  surveyId,
  companyId,
  initialItems,
  onItemsChange,
}: ChecklistPanelProps) {
  const [items, setItems] = useState<SurveyChecklistItem[]>(initialItems);
  const [templates, setTemplates] = useState<ChecklistTemplateOption[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [applyingTemplates, setApplyingTemplates] = useState(false);
  const [workingItemId, setWorkingItemId] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    onItemsChange(items);
  }, [items, onItemsChange]);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const data = await listChecklistTemplatesForSurvey(companyId);
      setTemplates(data);
    } catch (error) {
      notifications.error({
        title: "Error cargando plantillas",
        description: error instanceof Error ? error.message : "No se pudieron cargar las plantillas.",
      });
    } finally {
      setLoadingTemplates(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (items.length > 0) return;
    void loadTemplates();
  }, [items.length, loadTemplates]);

  const nextOrder = useMemo(() => {
    if (items.length === 0) return 0;
    return Math.max(...items.map((item) => item.itemOrder)) + 1;
  }, [items]);

  const toggleTemplateSelection = (templateId: string, checked: boolean) => {
    setSelectedTemplateIds((current) => {
      if (checked) {
        if (current.includes(templateId)) return current;
        return [...current, templateId];
      }
      return current.filter((id) => id !== templateId);
    });
  };

  const applySelectedTemplates = async () => {
    if (items.length > 0) return;
    if (selectedTemplateIds.length === 0) return;

    const selectedTemplates = templates.filter((template) => selectedTemplateIds.includes(template.id));
    if (selectedTemplates.length === 0) return;

    setApplyingTemplates(true);
    try {
      const inserted = await applyChecklistTemplatesToSurvey(surveyId, selectedTemplates);
      setItems(inserted);
      setSelectedTemplateIds([]);
      notifications.success({
        title: "Checklist cargado",
        description: "Se aplicaron las plantillas seleccionadas.",
      });
    } catch (error) {
      notifications.error({
        title: "Error aplicando plantilla",
        description: error instanceof Error ? error.message : "No se pudieron aplicar las plantillas.",
      });
    } finally {
      setApplyingTemplates(false);
    }
  };

  const toggleChecked = async (item: SurveyChecklistItem, checked: boolean) => {
    const previous = items;
    setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, checked } : entry)));
    setWorkingItemId(item.id);

    try {
      await updateSurveyChecklistItem(item.id, { checked });
    } catch (error) {
      setItems(previous);
      notifications.error({
        title: "Error actualizando item",
        description: error instanceof Error ? error.message : "No se pudo actualizar el item.",
      });
    } finally {
      setWorkingItemId(null);
    }
  };

  const addCustomItem = async () => {
    const clean = customText.trim();
    if (!clean) return;

    setAddingCustom(true);
    try {
      const created = await createCustomChecklistItem(surveyId, clean, nextOrder);
      setItems((current) => [...current, created].sort((a, b) => a.itemOrder - b.itemOrder));
      setCustomText("");
    } catch (error) {
      notifications.error({
        title: "Error agregando item",
        description: error instanceof Error ? error.message : "No se pudo crear el item personalizado.",
      });
    } finally {
      setAddingCustom(false);
    }
  };

  const removeItem = async (item: SurveyChecklistItem) => {
    const previous = items;
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    setWorkingItemId(item.id);

    try {
      await deleteSurveyChecklistItem(item.id);
    } catch (error) {
      setItems(previous);
      notifications.error({
        title: "Error eliminando item",
        description: error instanceof Error ? error.message : "No se pudo eliminar el item.",
      });
    } finally {
      setWorkingItemId(null);
    }
  };

  return (
    <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ClipboardList size={16} className="text-slate-500" />
          Checklist tecnico
        </h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{items.length} items</span>
      </header>

      {items.length === 0 ? (
        <div className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
          <p className="text-sm text-slate-600">No hay items cargados. Selecciona una o varias plantillas para iniciar.</p>
          {loadingTemplates ? (
            <p className="text-xs text-slate-500">Cargando plantillas...</p>
          ) : templates.length === 0 ? (
            <p className="text-xs text-slate-500">No hay plantillas disponibles.</p>
          ) : (
            <div className="space-y-2">
              <div className="grid gap-2">
              {templates.map((template) => (
                <label
                  key={template.id}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:border-blue-300 hover:bg-blue-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedTemplateIds.includes(template.id)}
                    onChange={(event) => {
                      toggleTemplateSelection(template.id, event.target.checked);
                    }}
                    disabled={applyingTemplates}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{template.name}</p>
                  <p className="text-xs text-slate-500">{template.description || "Sin descripcion"}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{template.items.length} items</p>
                  </div>
                </label>
              ))}
              </div>

              <Button
                type="button"
                onClick={() => void applySelectedTemplates()}
                disabled={applyingTemplates || selectedTemplateIds.length === 0}
                className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
              >
                {applyingTemplates ? "Aplicando plantillas..." : `Aplicar seleccion (${selectedTemplateIds.length})`}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(event) => void toggleChecked(item, event.target.checked)}
                  disabled={workingItemId === item.id}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${item.checked ? "text-slate-500 line-through" : "text-slate-800"}`}>
                    {item.text}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void removeItem(item)}
                  disabled={workingItemId === item.id}
                  className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  title="Eliminar item"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={customText}
          onChange={(event) => setCustomText(event.target.value)}
          placeholder="Agregar item personalizado"
          className="h-10 flex-1 py-2"
        />
        <Button
          type="button"
          onClick={() => void addCustomItem()}
          disabled={addingCustom || !customText.trim()}
          className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
          icon={<Plus size={14} />}
        >
          Agregar
        </Button>
      </div>
    </article>
  );
}
