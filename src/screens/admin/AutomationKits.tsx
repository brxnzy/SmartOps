import Button from "../../components/Button";
import ConfirmModal from "../../components/ConfirmModal";
import Field from "../../components/Field";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import useAutomationKits from "../../hooks/useAutomationKits";

function formatMoney(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AutomationKits() {
  const {
    loading,
    submitting,
    isModalOpen,
    editingKit,
    kitToDelete,
    name,
    discountPercent,
    selectedDeviceId,
    items,
    searchTerm,
    filteredKits,
    devices,
    companyId,
    canCreate,
    canUpdate,
    canDelete,
    subtotal,
    discountValue,
    total,
    hasChanges,
    setName,
    setDiscountPercent,
    setSelectedDeviceId,
    setSearchTerm,
    openCreateModal,
    openEditModal,
    closeModal,
    addItem,
    incrementItem,
    decrementItem,
    removeItem,
    handleSubmit,
    askDeleteKit,
    cancelDeleteKit,
    confirmDeleteKit,
  } = useAutomationKits();

  return (
    <section className="space-y-6">
      <header className="px-1 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-800">Kits de domotica</h1>
          <p className="text-sm text-slate-500">Crea kits con multiples dispositivos y descuento aplicado.</p>
        </div>

        {canCreate && (
          <Button
            type="button"
            onClick={openCreateModal}
            disabled={!companyId || submitting}
            className="bg-blue-600 text-white hover:bg-blue-500"
          >
            Nuevo kit
          </Button>
        )}
      </header>

      <Input
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        maxLength={120}
        placeholder="Buscar por nombre de kit o dispositivos..."
      />

      <div className="space-y-3">
        {!loading && filteredKits.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            No hay kits disponibles para la busqueda.
          </div>
        )}

        {!loading &&
          filteredKits.map((kit) => {
            const kitSubtotal = kit.items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
            const kitDiscount = (kitSubtotal * (kit.discountPercent ?? 0)) / 100;
            const kitTotal = Math.max(0, kitSubtotal - kitDiscount);

            return (
              <article key={kit.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-slate-800">{kit.name}</h2>
                    <p className="text-sm text-slate-600">
                      Dispositivos: {kit.items.map((item) => item.deviceName).join(", ") || "Sin items"}
                    </p>
                    <p className="text-sm text-slate-500">
                      Subtotal: USD {formatMoney(kitSubtotal)} · Descuento: {kit.discountPercent ?? 0}% · Total:
                      USD {formatMoney(kitTotal)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {canUpdate && (
                      <Button
                        type="button"
                        onClick={() => openEditModal(kit)}
                        disabled={submitting}
                        className="border-amber-300 text-amber-700 hover:bg-amber-50"
                      >
                        Editar
                      </Button>
                    )}

                    {canDelete && (
                      <Button
                        type="button"
                        onClick={() => askDeleteKit(kit)}
                        disabled={submitting}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
      </div>

      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title={editingKit ? "Editar kit" : "Crear kit"}
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
              form="kit-form"
              disabled={submitting || !name.trim() || items.length === 0 || !hasChanges}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              {editingKit ? "Guardar cambios" : "Crear kit"}
            </Button>
          </>
        }
      >
        <form id="kit-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Nombre del kit">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                placeholder="Ejemplo: Kit seguridad basico"
              />
            </Field>

            <Field label="Descuento (%)">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={discountPercent}
                onChange={(event) => setDiscountPercent(event.target.value)}
                placeholder="Ejemplo: 10"
              />
            </Field>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <Field label="Agregar dispositivo">
              <select
                value={selectedDeviceId}
                onChange={(event) => setSelectedDeviceId(event.target.value)}
                className="block w-full rounded-lg border-2 border-gray-400 bg-white px-3 py-3 focus:border-blue-500 focus:ring-blue-300 focus:outline-none"
              >
                <option value="">Selecciona un dispositivo</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name} - {device.model}
                  </option>
                ))}
              </select>
            </Field>

            <div className="flex items-end">
              <Button
                type="button"
                onClick={addItem}
                disabled={!selectedDeviceId || submitting}
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                Agregar
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {items.length === 0 && (
              <p className="text-sm text-slate-500">Agrega dispositivos para construir el kit.</p>
            )}
            {items.map((item) => (
              <div
                key={item.deviceId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-semibold text-slate-800">{item.deviceName}</p>
                  <p className="text-xs text-slate-500">{item.deviceModel}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => decrementItem(item.deviceId)}
                    className="border-slate-300 text-slate-700 hover:bg-slate-100"
                  >
                    -
                  </Button>
                  <span className="min-w-[2rem] text-center font-semibold text-slate-800">{item.quantity}</span>
                  <Button
                    type="button"
                    onClick={() => incrementItem(item.deviceId)}
                    className="border-slate-300 text-slate-700 hover:bg-slate-100"
                  >
                    +
                  </Button>
                  <Button
                    type="button"
                    onClick={() => removeItem(item.deviceId)}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    Quitar
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p>
              Subtotal: <span className="font-semibold text-slate-900">USD {formatMoney(subtotal)}</span>
            </p>
            <p className="mt-1">
              Descuento: <span className="font-semibold text-slate-900">USD {formatMoney(discountValue)}</span>
            </p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              Total: USD {formatMoney(total)}
            </p>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(kitToDelete)}
        title="Eliminar kit"
        message={`Deseas eliminar el kit ${kitToDelete?.name ?? "(sin nombre)"}?`}
        loading={submitting}
        onCancel={cancelDeleteKit}
        onConfirm={confirmDeleteKit}
      />
    </section>
  );
}
