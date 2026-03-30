import Button from "../../../components/Button";
import ConfirmModal from "../../../components/ConfirmModal";
import Field from "../../../components/Field";
import Input from "../../../components/Input";
import Modal from "../../../components/Modal";
import useSettingsTicketCategories from "../../../hooks/useSettingsTicketCategories";

export default function SettingsTicketCategories() {
  const {
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
  } = useSettingsTicketCategories();

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between px-1">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-800">Categorias de tickets</h1>
          <p className="text-sm text-slate-500">Configura las categorias visibles para los clientes.</p>
        </div>

        {canCreate && (
          <Button
            type="button"
            onClick={openCreateModal}
            disabled={!companyId || submitting}
            className="bg-blue-600 text-white hover:bg-blue-500"
          >
            Nueva categoria
          </Button>
        )}
      </header>

      <Input
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        maxLength={120}
        placeholder="Buscar categorias..."
      />

      <div className="space-y-3">
        {!loading && filteredCategories.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            No hay categorias para la busqueda.
          </div>
        )}

        {!loading &&
          filteredCategories.map((category) => (
            <article
              key={category.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-slate-800">{category.name}</h2>
                  {category.description && (
                    <p className="text-sm text-slate-600">{category.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {canUpdate && (
                    <Button
                      type="button"
                      onClick={() => openEditModal(category)}
                      disabled={submitting}
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      Editar
                    </Button>
                  )}

                  {canDelete && (
                    <Button
                      type="button"
                      onClick={() => askDeleteCategory(category)}
                      disabled={submitting}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      Eliminar
                    </Button>
                  )}
                </div>
              </div>
            </article>
          ))}
      </div>

      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title={editingCategory ? "Editar categoria" : "Crear categoria"}
        footer={
          <>
            <Button
              type="button"
              onClick={closeModal}
              disabled={submitting}
              className="border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="ticket-category-form"
              disabled={submitting || !name.trim() || !hasChanges}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              {editingCategory ? "Guardar cambios" : "Crear categoria"}
            </Button>
          </>
        }
      >
        <form id="ticket-category-form" onSubmit={handleSubmit} className="space-y-3">
          <Field label="Nombre">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              placeholder="Ejemplo: No enciende"
            />
          </Field>

          <Field label="Descripcion (opcional)">
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={255}
              placeholder="Breve descripcion de la categoria"
            />
          </Field>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(categoryToDelete)}
        title="Eliminar categoria"
        message={`Deseas eliminar la categoria ${categoryToDelete?.name ?? "(sin nombre)"}?`}
        loading={submitting}
        onCancel={cancelDeleteCategory}
        onConfirm={confirmDeleteCategory}
      />
    </section>
  );
}
