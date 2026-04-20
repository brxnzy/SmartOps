import Button from "../../components/Button";
import ConfirmModal from "../../components/ConfirmModal";
import Field from "../../components/Field";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import useSuppliers from "../../hooks/useSuppliers";
import { formatPhoneDigits } from "../../utils/formatters";
import { downloadPDF } from "../../utils/reportPdf";

export default function Suppliers() {
  const {
    loading,
    submitting,
    isModalOpen,
    editingSupplier,
    supplierToDelete,
    name,
    email,
    phone,
    address,
    searchTerm,
    filteredSuppliers,
    companyId,
    canCreate,
    canUpdate,
    canDelete,
    hasChanges,
    isValidForm,
    setName,
    setEmail,
    setPhone,
    setAddress,
    setSearchTerm,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    askDeleteSupplier,
    cancelDeleteSupplier,
    confirmDeleteSupplier,
  } = useSuppliers();

  const handleDownload = () => {
    downloadPDF(filteredSuppliers, 'suppliers_report.pdf', ['name', 'email', 'phone', 'address']);
  };

  return (
    <section className="space-y-6">
      <header className="px-1 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-800">Proveedores</h1>
          <p className="text-sm text-slate-500">Administra el catalogo de proveedores por compania.</p>
        </div>

        {canCreate && (
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleDownload}
              disabled={!companyId || submitting}
              className="bg-green-600 text-white hover:bg-green-500"
            >
              Descargar Reporte
            </Button>
            <Button
              type="button"
              onClick={openCreateModal}
              disabled={!companyId || submitting}
              className="bg-blue-600 text-white hover:bg-blue-500"
            >
              Nuevo proveedor
            </Button>
          </div>
        )}
      </header>

      <Input
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        maxLength={120}
        placeholder="Buscar por nombre, email, telefono o direccion..."
      />

      <div className="space-y-3">
        {!loading && filteredSuppliers.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            No hay proveedores disponibles para la busqueda.
          </div>
        )}

        {!loading &&
          filteredSuppliers.map((supplier) => (
            <article key={supplier.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-slate-800">{supplier.name}</h2>
                  <p className="text-sm text-slate-600">Email: {supplier.email ?? "No definido"}</p>
                  <p className="text-sm text-slate-600">Telefono: {supplier.phone ?? "No definido"}</p>
                  <p className="text-sm text-slate-500">Direccion: {supplier.address ?? "No definida"}</p>
                </div>

                <div className="flex items-center gap-2">
                  {canUpdate && (
                    <Button
                      type="button"
                      onClick={() => openEditModal(supplier)}
                      disabled={submitting}
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      Editar
                    </Button>
                  )}

                  {canDelete && (
                    <Button
                      type="button"
                      onClick={() => askDeleteSupplier(supplier)}
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
        title={editingSupplier ? "Editar proveedor" : "Crear proveedor"}
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
              form="supplier-form"
              disabled={submitting || !name.trim() || !isValidForm || !hasChanges}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              {editingSupplier ? "Guardar cambios" : "Crear proveedor"}
            </Button>
          </>
        }
      >
        <form id="supplier-form" onSubmit={handleSubmit} className="grid gap-3 lg:grid-cols-2">
          <Field label="Nombre">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              placeholder="Ejemplo: Proveedor Central"
            />
          </Field>

          <Field label="Email">
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={160}
              placeholder="Ejemplo: proveedor@correo.com"
            />
          </Field>

          <Field label="Telefono">
            <Input
              value={phone}
              onChange={(event) => setPhone(formatPhoneDigits(event.target.value))}
              maxLength={20}
              placeholder="Ejemplo: 809-555-0101"
            />
          </Field>

          <Field label="Direccion">
            <Input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              maxLength={180}
              placeholder="Ejemplo: Av. Principal #123"
            />
          </Field>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(supplierToDelete)}
        title="Eliminar proveedor"
        message={`Deseas eliminar el proveedor ${supplierToDelete?.name ?? "(sin nombre)"}?`}
        loading={submitting}
        onCancel={cancelDeleteSupplier}
        onConfirm={confirmDeleteSupplier}
      />
    </section>
  );
}
