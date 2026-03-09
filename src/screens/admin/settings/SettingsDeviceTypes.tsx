import Button from "../../../components/Button";
import ConfirmModal from "../../../components/ConfirmModal";
import Field from "../../../components/Field";
import Input from "../../../components/Input";
import Modal from "../../../components/Modal";
import useSettingsDeviceTypes from "../../../hooks/useSettingsDeviceTypes";

export default function SettingsDeviceTypes() {
  const {
    loading,
    submitting,
    isModalOpen,
    editingDeviceType,
    name,
    description,
    searchTerm,
    deviceTypeToDelete,
    filteredDeviceTypes,
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
    askDeleteDeviceType,
    cancelDeleteDeviceType,
    confirmDeleteDeviceType,
  } = useSettingsDeviceTypes();

  return (
    <section className="space-y-6">
      <header className="px-1 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-800">Tipos de dispositivos</h1>
          <p className="text-sm text-slate-500">Administra el catalogo de tipos de dispositivos por compania.</p>
        </div>

        {canCreate && (
          <Button
            type="button"
            onClick={openCreateModal}
            disabled={!companyId || submitting}
            className="bg-blue-600 text-white hover:bg-blue-500"
          >
            Nuevo tipo
          </Button>
        )}
      </header>

      <Input
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        maxLength={120}
        placeholder="Buscar tipos de dispositivos..."
      />

      <div className="space-y-3">
        {!loading && filteredDeviceTypes.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            No hay tipos de dispositivos para la busqueda.
          </div>
        )}

        {!loading &&
          filteredDeviceTypes.map((deviceType) => (
            <article
              key={deviceType.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-slate-800">{deviceType.name}</h2>
                  {deviceType.description && (
                    <p className="text-sm text-slate-600">{deviceType.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {canUpdate && (
                    <Button
                      type="button"
                      onClick={() => openEditModal(deviceType)}
                      disabled={submitting}
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      Editar
                    </Button>
                  )}

                  {canDelete && (
                    <Button
                      type="button"
                      onClick={() => askDeleteDeviceType(deviceType)}
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
        title={editingDeviceType ? "Editar tipo de dispositivo" : "Crear tipo de dispositivo"}
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
              form="device-type-form"
              disabled={submitting || !name.trim() || !hasChanges}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              {editingDeviceType ? "Guardar cambios" : "Crear tipo"}
            </Button>
          </>
        }
      >
        <form id="device-type-form" onSubmit={handleSubmit} className="space-y-3">
          <Field label="Nombre">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              placeholder="Ejemplo: Sensor de temperatura"
            />
          </Field>

          <Field label="Descripcion (opcional)">
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={255}
              placeholder="Breve descripcion del tipo de dispositivo"
            />
          </Field>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(deviceTypeToDelete)}
        title="Eliminar tipo de dispositivo"
        message={`Deseas eliminar el tipo de dispositivo ${deviceTypeToDelete?.name ?? "(sin nombre)"}?`}
        loading={submitting}
        onCancel={cancelDeleteDeviceType}
        onConfirm={confirmDeleteDeviceType}
      />
    </section>
  );
}
