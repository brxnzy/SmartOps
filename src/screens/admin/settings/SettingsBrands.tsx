import Button from "../../../components/Button";
import Field from "../../../components/Field";
import Input from "../../../components/Input";
import Modal from "../../../components/Modal";
import useSettingsBrands from "../../../hooks/useSettingsBrands";

export default function SettingsBrands() {
  const {
    brands,
    loading,
    submitting,
    isModalOpen,
    editingBrand,
    brandName,
    hasChanges,
    companyId,
    canCreate,
    canUpdate,
    canDelete,
    setBrandName,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    handleDelete,
  } = useSettingsBrands();

  return (
    <section className="space-y-6">
      <header className="px-1 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-800">Marcas</h1>
          <p className="text-sm text-slate-500">Administra el catalogo de marcas por compania.</p>
        </div>

        {canCreate && (
          <Button
            type="button"
            onClick={openCreateModal}
            disabled={!companyId || submitting}
            className="bg-blue-600 text-white hover:bg-blue-500"
          >
            Nueva marca
          </Button>
        )}
      </header>

      <div className="space-y-3">
        {!loading && brands.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            No hay marcas disponibles.
          </div>
        )}

        {!loading &&
          brands.map((brand) => (
            <article
              key={brand.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-slate-800">{brand.name}</h2>
                </div>

                <div className="flex items-center gap-2">
                  {canUpdate && (
                    <Button
                      type="button"
                      onClick={() => openEditModal(brand)}
                      disabled={submitting}
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      Editar
                    </Button>
                  )}

                  {canDelete && (
                    <Button
                      type="button"
                      onClick={() => handleDelete(brand)}
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
        title={editingBrand ? "Editar marca" : "Crear marca"}
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
              form="brand-form"
              disabled={submitting || !brandName.trim() || !hasChanges}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              {editingBrand ? "Guardar cambios" : "Crear marca"}
            </Button>
          </>
        }
      >
        <form id="brand-form" onSubmit={handleSubmit} className="space-y-3">
          <Field label="Nombre">
            <Input
              value={brandName}
              onChange={(event) => setBrandName(event.target.value)}
              maxLength={120}
              placeholder="Ejemplo: Siemens"
            />
          </Field>
        </form>
      </Modal>
    </section>
  );
}
