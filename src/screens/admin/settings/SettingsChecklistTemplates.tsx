import { useState } from "react";
import Button from "../../../components/Button";
import ConfirmModal from "../../../components/ConfirmModal";
import Field from "../../../components/Field";
import Input from "../../../components/Input";
import Modal from "../../../components/Modal";
import useSettingsChecklistTemplates from "../../../hooks/useSettingsChecklistTemplates";

export default function SettingsChecklistTemplates() {
  const {
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
  } = useSettingsChecklistTemplates();

  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const toggleAccordion = (templateId: string) => {
    if (editingTemplateId === templateId) {
      cancelEditTemplate();
      setExpandedTemplateId(null);
      return;
    }

    setExpandedTemplateId((current) => (current === templateId ? null : templateId));
  };

  const handleStartEdit = (templateId: string) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;

    startEditTemplate(template);
    setExpandedTemplateId(templateId);
  };

  const handleCancelEdit = () => {
    cancelEditTemplate();
    setExpandedTemplateId(null);
  };

  const handleCreateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const created = await handleCreateTemplate();
    if (created) {
      setIsCreateModalOpen(false);
    }
  };

  const activeItemTemplate = templates.find((template) => template.id === itemTemplateId);

  return (
    <section className="space-y-6">
      <header className="px-1 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-800">Plantillas de checklist</h1>
          <p className="text-sm text-slate-500">
            Administra las plantillas y sus items para los checklists.
          </p>
        </div>

        {canCreateTemplate && (
          <Button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            disabled={!companyId || submitting}
            className="bg-blue-600 text-white hover:bg-blue-500"
          >
            Nueva plantilla
          </Button>
        )}
      </header>

      <Input
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        maxLength={120}
        placeholder="Buscar plantillas..."
      />

      <div className="space-y-3">
        {!loading && filteredTemplates.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            No hay plantillas disponibles para la busqueda.
          </div>
        )}

        {!loading &&
          filteredTemplates.map((template) => {
            const items = itemsByTemplateId[template.id] ?? [];
            const isEditing = editingTemplateId === template.id;
            const isOpen = isEditing || expandedTemplateId === template.id;
            const summaryItemCount = items.length;

            return (
              <article
                key={template.id}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                  isOpen ? "border-blue-200" : "border-slate-200"
                }`}
              >
                <header className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-slate-800">{template.name}</h2>
                    <p className="text-xs text-slate-500">
                      {summaryItemCount} item{summaryItemCount === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {canUpdateTemplate && !isEditing && (
                      <Button
                        type="button"
                        onClick={() => handleStartEdit(template.id)}
                        disabled={submitting}
                        className="border-amber-300 text-amber-700 hover:bg-amber-50"
                      >
                        Editar
                      </Button>
                    )}

                    {canDeleteTemplate && !isEditing && (
                      <Button
                        type="button"
                        onClick={() => askDeleteTemplate(template)}
                        disabled={submitting}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        Eliminar
                      </Button>
                    )}

                    <Button
                      type="button"
                      onClick={() => toggleAccordion(template.id)}
                      className="border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                      {isOpen ? "Ocultar" : "Ver items"}
                    </Button>
                  </div>
                </header>

                {isOpen && (
                  <div className="space-y-4 border-t border-slate-200 p-4">
                    {isEditing ? (
                      <div className="space-y-3">
                        <Field label="Nombre de la plantilla">
                          <Input
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            maxLength={100}
                            className="py-2"
                          />
                        </Field>
                        <Field label="Descripcion">
                          <Input
                            value={editingDescription}
                            onChange={(event) => setEditingDescription(event.target.value)}
                            maxLength={240}
                            className="py-2"
                            placeholder="Opcional"
                          />
                        </Field>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Nombre</p>
                          <p className="mt-1 text-sm font-medium text-slate-800">{template.name}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Descripcion</p>
                          <p className="mt-1 text-sm text-slate-700">
                            {template.description?.trim() || "Sin descripcion"}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Items</p>
                        {canCreateItem && (
                          <Button
                            type="button"
                            onClick={() => openCreateItem(template.id)}
                            disabled={submitting}
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                          >
                            Agregar item
                          </Button>
                        )}
                      </div>

                      {items.length === 0 ? (
                        <p className="text-sm text-slate-500">Esta plantilla no tiene items.</p>
                      ) : (
                        <div className="space-y-2">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                            >
                              <span className="text-sm text-slate-700">{item.text}</span>
                              <div className="flex flex-wrap items-center gap-2">
                                {canUpdateItem && (
                                  <Button
                                    type="button"
                                    onClick={() => openEditItem(template.id, item)}
                                    disabled={submitting}
                                    className="border-amber-300 text-amber-700 hover:bg-amber-50"
                                  >
                                    Editar
                                  </Button>
                                )}
                                {canDeleteItem && (
                                  <Button
                                    type="button"
                                    onClick={() => askDeleteItem(template.id, item)}
                                    disabled={submitting}
                                    className="border-red-300 text-red-700 hover:bg-red-50"
                                  >
                                    Eliminar
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {canUpdateTemplate && isEditing && (
                      <div className="flex flex-wrap justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          onClick={() => handleUpdateTemplate(template.id)}
                          disabled={submitting || !editingName.trim() || !hasEditingChanges}
                          className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                          Guardar cambios
                        </Button>
                        <Button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={submitting}
                          className="border-slate-300 text-slate-700 hover:bg-slate-100"
                        >
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
      </div>

      <Modal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Crear nueva plantilla"
        footer={
          <>
            <Button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={submitting}
              className="border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Cerrar
            </Button>
            <Button
              type="submit"
              form="create-template-form"
              disabled={submitting || !newTemplateName.trim() || !companyId}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              Crear plantilla
            </Button>
          </>
        }
      >
        <form id="create-template-form" onSubmit={handleCreateSubmit} className="space-y-3">
          <Field label="Nombre">
            <Input
              value={newTemplateName}
              onChange={(event) => setNewTemplateName(event.target.value)}
              placeholder="Ejemplo: Checklist de mantenimiento"
              maxLength={100}
            />
          </Field>
          <Field label="Descripcion">
            <Input
              value={newTemplateDescription}
              onChange={(event) => setNewTemplateDescription(event.target.value)}
              placeholder="Opcional"
              maxLength={240}
            />
          </Field>
          {!companyId && (
            <p className="text-sm text-amber-600">Debes tener una compania asignada para crear plantillas.</p>
          )}
        </form>
      </Modal>

      <Modal
        open={isItemModalOpen}
        onClose={closeItemModal}
        title={editingItem ? "Editar item" : "Agregar item"}
        subtitle={activeItemTemplate ? `Plantilla: ${activeItemTemplate.name}` : undefined}
        footer={
          <>
            <Button
              type="button"
              onClick={closeItemModal}
              disabled={submitting}
              className="border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="item-form"
              disabled={submitting || !itemHasChanges}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              {editingItem ? "Guardar cambios" : "Agregar item"}
            </Button>
          </>
        }
      >
        <form id="item-form" onSubmit={handleSubmitItem} className="space-y-3">
          <Field label="Texto del item">
            <Input
              value={itemText}
              onChange={(event) => setItemText(event.target.value)}
              placeholder="Ejemplo: Revisar temperatura"
              maxLength={240}
            />
          </Field>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(templateToDelete)}
        title="Eliminar plantilla"
        message={`Deseas eliminar la plantilla ${templateToDelete?.name ?? "(sin nombre)"}?`}
        loading={submitting}
        onCancel={cancelDeleteTemplate}
        onConfirm={confirmDeleteTemplate}
      />

      <ConfirmModal
        open={Boolean(itemToDelete)}
        title="Eliminar item"
        message={`Deseas eliminar el item ${itemToDelete?.item.text ?? "(sin texto)"}?`}
        loading={submitting}
        onCancel={cancelDeleteItem}
        onConfirm={confirmDeleteItem}
      />
    </section>
  );
}
