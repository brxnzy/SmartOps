import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "../../../components/Button";
import Field from "../../../components/Field";
import Input from "../../../components/Input";
import { PERMISSIONS } from "../../../constants/permissions";
import { useAuth } from "../../../hooks/useAuth";
import { notifications } from "../../../services/notification.service";
import {
  createPostInstallationChecklistItem,
  deletePostInstallationChecklistItem,
  getOrCreatePostInstallationChecklist,
  listPostInstallationChecklistItems,
  updatePostInstallationChecklist,
  updatePostInstallationChecklistItem,
  type PostInstallationChecklist,
  type PostInstallationChecklistItem,
} from "../../../services/postInstallationChecks.service";

export default function SettingsPostInstallationChecks() {
  const { companyProfile, canAccess } = useAuth();
  const companyId = companyProfile?.id ?? null;

  const canRead = canAccess(PERMISSIONS.settingsPostInstallationChecksRead);
  const canUpdateTemplate = canAccess(PERMISSIONS.settingsPostInstallationChecksUpdate);
  const canCreateItem = canAccess(PERMISSIONS.settingsPostInstallationCheckItemsCreate);
  const canUpdateItem = canAccess(PERMISSIONS.settingsPostInstallationCheckItemsUpdate);
  const canDeleteItem = canAccess(PERMISSIONS.settingsPostInstallationCheckItemsDelete);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [checklist, setChecklist] = useState<PostInstallationChecklist | null>(null);
  const [items, setItems] = useState<PostInstallationChecklistItem[]>([]);

  const [name, setName] = useState("Pruebas post instalacion");
  const [description, setDescription] = useState("");
  const [newItem, setNewItem] = useState("");

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState("");

  const loadData = useCallback(async () => {
    if (!companyId || !canRead) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const checklistData = await getOrCreatePostInstallationChecklist(companyId);
      const itemRows = await listPostInstallationChecklistItems(checklistData.id);

      setChecklist(checklistData);
      setItems(itemRows);
      setName(checklistData.name);
      setDescription(checklistData.description ?? "");
    } catch (error) {
      notifications.error({
        title: "Error cargando pruebas post instalacion",
        description: error instanceof Error ? error.message : "No se pudo cargar la configuracion.",
      });
    } finally {
      setLoading(false);
    }
  }, [canRead, companyId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const hasTemplateChanges = useMemo(() => {
    if (!checklist) return false;
    return name.trim() !== checklist.name || (description.trim() || "") !== (checklist.description ?? "");
  }, [checklist, description, name]);

  const handleSaveHeader = async () => {
    if (!companyId || !checklist || !canUpdateTemplate) return;

    setSaving(true);
    try {
      await updatePostInstallationChecklist({
        checklistId: checklist.id,
        companyId,
        name,
        description: description || null,
      });

      notifications.success({
        title: "Configuracion guardada",
        description: "Se actualizo el nombre/descripcion del checklist general.",
      });
      await loadData();
    } catch (error) {
      notifications.error({
        title: "Error guardando",
        description: error instanceof Error ? error.message : "No se pudo guardar la configuracion.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateItem = async () => {
    if (!companyId || !checklist || !canCreateItem) return;

    const text = newItem.trim();
    if (!text) {
      notifications.warning({
        title: "Item requerido",
        description: "Escribe el texto del item.",
      });
      return;
    }

    setSaving(true);
    try {
      await createPostInstallationChecklistItem({
        checklistId: checklist.id,
        companyId,
        text,
      });
      setNewItem("");
      notifications.success({
        title: "Item agregado",
        description: "El item fue agregado al checklist general.",
      });
      await loadData();
    } catch (error) {
      notifications.error({
        title: "Error creando item",
        description: error instanceof Error ? error.message : "No se pudo crear el item.",
      });
    } finally {
      setSaving(false);
    }
  };

  const startEditItem = (item: PostInstallationChecklistItem) => {
    setEditingItemId(item.id);
    setEditingItemText(item.text);
  };

  const cancelEditItem = () => {
    setEditingItemId(null);
    setEditingItemText("");
  };

  const handleSaveItem = async (itemId: string) => {
    if (!companyId || !canUpdateItem) return;

    const text = editingItemText.trim();
    if (!text) {
      notifications.warning({
        title: "Item requerido",
        description: "El texto del item no puede estar vacio.",
      });
      return;
    }

    setSaving(true);
    try {
      await updatePostInstallationChecklistItem({ itemId, companyId, text });
      notifications.success({
        title: "Item actualizado",
        description: "Se actualizo el item correctamente.",
      });
      cancelEditItem();
      await loadData();
    } catch (error) {
      notifications.error({
        title: "Error actualizando item",
        description: error instanceof Error ? error.message : "No se pudo actualizar el item.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!companyId || !canDeleteItem) return;
    const confirmed = window.confirm("Se desactivara este item para nuevos proyectos. Deseas continuar?");
    if (!confirmed) return;

    setSaving(true);
    try {
      await deletePostInstallationChecklistItem({ itemId, companyId });
      notifications.success({
        title: "Item eliminado",
        description: "El item se desactivo correctamente.",
      });
      await loadData();
    } catch (error) {
      notifications.error({
        title: "Error eliminando item",
        description: error instanceof Error ? error.message : "No se pudo eliminar el item.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!canRead) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700">
        No tienes permisos para ver pruebas post instalacion.
      </section>
    );
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
        Cargando pruebas post instalacion...
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-800">Pruebas post instalacion</h1>
        <p className="mt-2 text-slate-600">
          Checklist general por compania que se aplica en todos los proyectos de instalacion.
        </p>
      </header>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Configuracion general</h2>

        <Field label="Nombre">
          <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} />
        </Field>

        <Field label="Descripcion">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-[90px] w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
          />
        </Field>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => void handleSaveHeader()}
            disabled={!canUpdateTemplate || !hasTemplateChanges || saving}
            className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
          >
            {saving ? "Guardando..." : "Guardar configuracion"}
          </Button>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Items del checklist</h2>

        <div className="flex flex-wrap gap-2">
          <input
            value={newItem}
            onChange={(event) => setNewItem(event.target.value)}
            maxLength={200}
            placeholder="Ej. Validar escenas nocturnas"
            className="min-w-[280px] flex-1 rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
          />
          <Button
            type="button"
            onClick={() => void handleCreateItem()}
            disabled={!canCreateItem || saving || !newItem.trim()}
            className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
          >
            Agregar item
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-slate-500">No hay items activos en el checklist.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                {editingItemId === item.id ? (
                  <div className="space-y-2">
                    <input
                      value={editingItemText}
                      onChange={(event) => setEditingItemText(event.target.value)}
                      maxLength={200}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        onClick={cancelEditItem}
                        disabled={saving}
                        className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={() => void handleSaveItem(item.id)}
                        disabled={saving || !editingItemText.trim()}
                        className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Guardar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-slate-700">{item.text}</p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={() => startEditItem(item)}
                        disabled={!canUpdateItem || saving}
                        className="border-amber-300 bg-white text-amber-700 hover:bg-amber-50"
                      >
                        Editar
                      </Button>
                      <Button
                        type="button"
                        onClick={() => void handleDeleteItem(item.id)}
                        disabled={!canDeleteItem || saving}
                        className="border-rose-300 bg-white text-rose-700 hover:bg-rose-50"
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
