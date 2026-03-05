import Button from "../../components/Button";
import ConfirmModal from "../../components/ConfirmModal";
import Field from "../../components/Field";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import useDevices from "../../hooks/useDevices";

export default function Devices() {
  const {
    protocols,
    deviceTypes,
    brands,
    loading,
    submitting,
    isModalOpen,
    editingDevice,
    deviceToDelete,
    name,
    model,
    price,
    searchTerm,
    protocolId,
    deviceTypeId,
    brandId,
    hasChanges,
    filteredDevices,
    companyId,
    canCreate,
    canUpdate,
    canDelete,
    protocolNameById,
    deviceTypeNameById,
    brandNameById,
    setName,
    setModel,
    setPrice,
    setSearchTerm,
    setProtocolId,
    setDeviceTypeId,
    setBrandId,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    askDeleteDevice,
    cancelDeleteDevice,
    confirmDeleteDevice,
  } = useDevices();

  return (
    <section className="space-y-6">
      <header className="px-1 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-800">Dispositivos</h1>
          <p className="text-sm text-slate-500">Administra el catalogo de dispositivos por compania.</p>
        </div>

        {canCreate && (
          <Button
            type="button"
            onClick={openCreateModal}
            disabled={!companyId || submitting}
            className="bg-blue-600 text-white hover:bg-blue-500"
          >
            Nuevo dispositivo
          </Button>
        )}
      </header>

      <Input
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        maxLength={120}
        placeholder="Buscar por nombre, modelo, marca, tipo o protocolo..."
      />

      <div className="space-y-3">
        {!loading && filteredDevices.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            No hay dispositivos disponibles para la busqueda.
          </div>
        )}

        {!loading &&
          filteredDevices.map((device) => (
            <article key={device.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-slate-800">{device.name}</h2>
                  <p className="text-sm text-slate-600">Modelo: {device.model}</p>
                  <p className="text-sm text-slate-600">Precio: USD {device.price.toFixed(2)}</p>
                  <p className="text-sm text-slate-500">
                    Protocolo: {protocolNameById.get(device.protocolId) ?? "No definido"}
                  </p>
                  <p className="text-sm text-slate-500">
                    Tipo: {deviceTypeNameById.get(String(device.deviceTypeId)) ?? "No definido"}
                  </p>
                  <p className="text-sm text-slate-500">
                    Marca: {brandNameById.get(device.brandId) ?? "No definida"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {canUpdate && (
                    <Button
                      type="button"
                      onClick={() => openEditModal(device)}
                      disabled={submitting}
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      Editar
                    </Button>
                  )}

                  {canDelete && (
                    <Button
                      type="button"
                      onClick={() => askDeleteDevice(device)}
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
        title={editingDevice ? "Editar dispositivo" : "Crear dispositivo"}
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
              form="device-form"
              disabled={
                submitting ||
                !name.trim() ||
                !model.trim() ||
                !price.trim() ||
                !protocolId ||
                !deviceTypeId ||
                !brandId ||
                !hasChanges
              }
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              {editingDevice ? "Guardar cambios" : "Crear dispositivo"}
            </Button>
          </>
        }
      >
        <form id="device-form" onSubmit={handleSubmit} className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-3">
            <Field label="Nombre">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                placeholder="Ejemplo: Sensor de temperatura A1"
              />
            </Field>

            <Field label="Modelo">
              <Input
                value={model}
                onChange={(event) => setModel(event.target.value)}
                maxLength={120}
                placeholder="Ejemplo: TMP-900"
              />
            </Field>

            <Field label="Precio">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="Ejemplo: 199.99"
              />
            </Field>
          </div>

          <div className="space-y-3">
            <Field label="Protocolo">
              <select
                value={protocolId}
                onChange={(event) => setProtocolId(event.target.value)}
                className="block w-full py-3 px-3 bg-white border-2 border-gray-400 rounded-lg focus:border-blue-500 focus:ring-blue-300 focus:outline-none"
              >
                <option value="">Selecciona un protocolo</option>
                {protocols.map((protocol) => (
                  <option key={protocol.id} value={String(protocol.id)}>
                    {protocol.name?.trim() || "(Sin nombre)"}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Tipo de dispositivo">
              <select
                value={deviceTypeId}
                onChange={(event) => setDeviceTypeId(event.target.value)}
                className="block w-full py-3 px-3 bg-white border-2 border-gray-400 rounded-lg focus:border-blue-500 focus:ring-blue-300 focus:outline-none"
              >
                <option value="">Selecciona un tipo</option>
                {deviceTypes.map((deviceType) => (
                  <option key={deviceType.id} value={String(deviceType.id)}>
                    {deviceType.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Marca">
              <select
                value={brandId}
                onChange={(event) => setBrandId(event.target.value)}
                className="block w-full py-3 px-3 bg-white border-2 border-gray-400 rounded-lg focus:border-blue-500 focus:ring-blue-300 focus:outline-none"
              >
                <option value="">Selecciona una marca</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(deviceToDelete)}
        title="Eliminar dispositivo"
        message={`Deseas eliminar el dispositivo ${deviceToDelete?.name ?? "(sin nombre)"}?`}
        loading={submitting}
        onCancel={cancelDeleteDevice}
        onConfirm={confirmDeleteDevice}
      />
    </section>
  );
}
