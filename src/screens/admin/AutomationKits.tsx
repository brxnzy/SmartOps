import { useEffect, useMemo, useState } from "react";
import Button from "../../components/Button";
import ConfirmModal from "../../components/ConfirmModal";
import Field from "../../components/Field";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import useAutomationKits from "../../hooks/useAutomationKits";
import { downloadPDF } from "../../utils/reportPdf";

function QtyInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center overflow-hidden rounded-md border border-slate-300 bg-white">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="h-8 w-8 text-slate-500 hover:bg-slate-100"
      >
        -
      </button>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(event) => onChange(Math.max(1, Number(event.target.value) || 1))}
        className="h-8 w-14 text-center text-sm text-slate-800 outline-none"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="h-8 w-8 text-slate-500 hover:bg-slate-100"
      >
        +
      </button>
    </div>
  );
}

export default function AutomationKits() {
  const {
    loading,
    submitting,
    isModalOpen,
    editingKit,
    kitToDelete,
    name,
    description,
    price,
    items,
    searchTerm,
    filteredKits,
    devices,
    companyId,
    canCreate,
    canUpdate,
    canDelete,
    subtotal,
    hasChanges,
    setName,
    setDescription,
    setPrice,
    setSearchTerm,
    setItemsBulk,
    removeItem,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    askDeleteKit,
    cancelDeleteKit,
    confirmDeleteKit,
  } = useAutomationKits();

  const handleDownload = () => {
    downloadPDF(filteredKits, 'automation_kits_report.pdf', ['name', 'description', 'price', 'discountPercent']);
  };

  const [showProducts, setShowProducts] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [draftLines, setDraftLines] = useState<Record<string, number>>({});
  const [priceTouched, setPriceTouched] = useState(false);

  const filteredDevices = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return devices;
    return devices.filter((device) => {
      const text = `${device.name} ${device.model}`.toLowerCase();
      return text.includes(query);
    });
  }, [devices, productSearch]);

  const openProducts = () => {
    const initial: Record<string, number> = {};
    items.forEach((item) => {
      initial[item.deviceId] = item.quantity;
    });
    setDraftLines(initial);
    setProductSearch("");
    setShowProducts(true);
  };

  const applyDraft = () => {
    const nextItems = Object.entries(draftLines)
      .filter(([, qty]) => qty > 0)
      .map(([deviceId, quantity]) => ({ deviceId, quantity }));
    setItemsBulk(nextItems);
    setShowProducts(false);
  };

  const draftSelectedCount = useMemo(
    () => Object.values(draftLines).filter((qty) => qty > 0).length,
    [draftLines]
  );

  const draftUnits = useMemo(
    () => Object.values(draftLines).reduce((acc, qty) => acc + (qty > 0 ? qty : 0), 0),
    [draftLines]
  );

  useEffect(() => {
    if (!isModalOpen) {
      setShowProducts(false);
      setPriceTouched(false);
      return;
    }
    setPriceTouched(Boolean(editingKit));
  }, [editingKit, isModalOpen]);

  useEffect(() => {
    if (!isModalOpen) return;
    if (!priceTouched) {
      setPrice(subtotal.toFixed(2));
    }
  }, [isModalOpen, priceTouched, setPrice, subtotal]);

  return (
    <section className="space-y-6">
      <header className="px-1 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-800">Kits</h1>
          <p className="text-sm text-slate-500">Crea combos personalizados con dispositivos.</p>
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
              Crear kit
            </Button>
          </div>
        )}
      </header>

      <Input
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        maxLength={120}
        placeholder="Buscar por nombre, descripcion o dispositivos..."
      />

      <div className="space-y-3">
        {!loading && filteredKits.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            No hay kits disponibles para la busqueda.
          </div>
        )}

        {!loading &&
          filteredKits.map((kit) => (
            <article key={kit.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-slate-800">{kit.name}</h2>
                  <p className="text-sm text-slate-600">{kit.description}</p>
                  <p className="text-sm text-slate-500">
                    Dispositivos: {kit.items.map((item) => item.deviceName).join(", ") || "Sin items"}
                  </p>
                  <p className="text-sm font-semibold text-slate-800">Precio: {kit.price.toFixed(2)}</p>
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
          ))}
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
              disabled={
                submitting ||
                !name.trim() ||
                !description.trim() ||
                !price.trim() ||
                items.length === 0 ||
                !hasChanges
              }
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

            <div />
          </div>

          <Field label="Descripcion">
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Resume el kit y su utilidad."
              className="block w-full resize-none rounded-lg border-2 border-gray-400 bg-white px-3 py-3 text-sm text-slate-800 focus:border-blue-500 focus:ring-blue-300 focus:outline-none"
            />
          </Field>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-800">Productos</div>
              <Button
                type="button"
                onClick={openProducts}
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                Seleccionar productos
              </Button>
            </div>

            {items.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                Selecciona dispositivos para este kit.
              </div>
            )}

            {items.length > 0 && (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.deviceId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{item.deviceName}</p>
                      <p className="text-xs text-slate-500">{item.deviceModel}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-700">x{item.quantity}</span>
                      <span className="text-sm font-semibold text-slate-800">
                        {(item.unitPrice * item.quantity).toFixed(2)}
                      </span>
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
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Total calculado</div>
                <div className="text-lg font-semibold text-slate-900">{subtotal.toFixed(2)}</div>
              </div>
              <div className="w-full sm:w-48">
                <Field label="Precio final">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(event) => {
                      setPriceTouched(true);
                      setPrice(event.target.value);
                    }}
                    placeholder={subtotal.toFixed(2)}
                  />
                </Field>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={showProducts}
        onClose={() => setShowProducts(false)}
        title="Seleccionar dispositivos"
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <div className="text-sm text-slate-600">
              {draftSelectedCount > 0
                ? `${draftSelectedCount} productos - ${draftUnits} unidades`
                : "Ningun producto agregado"}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => setShowProducts(false)}
                className="border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={applyDraft}
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                Listo
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            value={productSearch}
            onChange={(event) => setProductSearch(event.target.value)}
            placeholder="Buscar dispositivo..."
          />
          <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-slate-200">
            {filteredDevices.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                No hay dispositivos disponibles.
              </div>
            )}
            {filteredDevices.map((device) => {
              const qty = draftLines[device.id] ?? 0;
              const isAdded = qty > 0;

              return (
                <div
                  key={device.id}
                  className={`flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 text-sm last:border-b-0 ${
                    isAdded ? "bg-blue-50" : "bg-white"
                  }`}
                >
                  <div className="min-w-0">
                    <div className={`truncate font-semibold ${isAdded ? "text-blue-700" : "text-slate-800"}`}>
                      {device.name}
                    </div>
                    <div className="text-xs text-slate-500">Modelo: {device.model}</div>
                  </div>
                  {!isAdded ? (
                    <Button
                      type="button"
                      onClick={() =>
                        setDraftLines((current) => ({
                          ...current,
                          [device.id]: 1,
                        }))
                      }
                      className="border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      Agregar
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <QtyInput
                        value={qty}
                        onChange={(value) =>
                          setDraftLines((current) => ({
                            ...current,
                            [device.id]: Math.max(1, value),
                          }))
                        }
                      />
                      <Button
                        type="button"
                        onClick={() =>
                          setDraftLines((current) => {
                            const next = { ...current };
                            delete next[device.id];
                            return next;
                          })
                        }
                        className="border-rose-300 text-rose-700 hover:bg-rose-50"
                      >
                        Quitar
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
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
