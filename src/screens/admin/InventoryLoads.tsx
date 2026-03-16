import { useEffect, useMemo, useState } from "react";
import { Eye } from "lucide-react";
import Button from "../../components/Button";
import Field from "../../components/Field";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import useInventoryLoads from "../../hooks/useInventoryLoads";

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

export default function InventoryLoads() {
  const [detailLoadId, setDetailLoadId] = useState<string | null>(null);
  const [showSupplier, setShowSupplier] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [draftLines, setDraftLines] = useState<Record<string, number>>({});

  const {
    loading,
    submitting,
    isModalOpen,
    supplierId,
    items,
    filteredLoads,
    suppliers,
    devices,
    companyId,
    canCreate,
    supplierNameById,
    deviceNameById,
    deviceModelById,
    selectSupplier,
    handleSubmit,
    removeItem,
    setItemsBulk,
    openCreateModal,
    closeModal,
  } = useInventoryLoads();

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === supplierId) ?? null,
    [suppliers, supplierId]
  );

  const selectedDetailLoad = useMemo(
    () => filteredLoads.find((load) => load.id === detailLoadId) ?? null,
    [detailLoadId, filteredLoads]
  );

  const totalDevicesForLoad = (loadId: string) => {
    const load = filteredLoads.find((item) => item.id === loadId);
    if (!load) return 0;
    return load.items.reduce((acc, item) => acc + item.quantity, 0);
  };

  const filteredSuppliers = useMemo(() => {
    const query = supplierSearch.trim().toLowerCase();
    if (!query) return suppliers;

    return suppliers.filter((supplier) => {
      const text = `${supplier.name} ${supplier.email ?? ""} ${supplier.phone ?? ""}`.toLowerCase();
      return text.includes(query);
    });
  }, [supplierSearch, suppliers]);

  const filteredDevices = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return devices;
    return devices.filter((device) => {
      const text = `${device.name} ${device.model}`.toLowerCase();
      return text.includes(query);
    });
  }, [devices, productSearch]);

  const openSupplierModal = () => {
    setSupplierSearch("");
    setShowSupplier(true);
  };

  const openCreateFlow = () => {
    setShowSupplier(false);
    setShowProducts(false);
    openCreateModal();
  };

  const closeCreateFlow = () => {
    setShowSupplier(false);
    setShowProducts(false);
    closeModal();
  };

  const openProducts = () => {
    if (!supplierId) return;
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

  const totalUnits = useMemo(() => items.reduce((acc, item) => acc + item.quantity, 0), [items]);

  const supplierMeta = (supplier: { email: string | null; phone: string | null }) => {
    const meta = [supplier.email, supplier.phone].filter(Boolean).join(" - ");
    return meta || "Sin contacto";
  };

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString("es-DO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

  useEffect(() => {
    if (!isModalOpen) {
      setShowSupplier(false);
      setShowProducts(false);
    }
  }, [isModalOpen]);

  return (
    <section className="space-y-6">
      <header className="px-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-slate-800">Registro de cargas</h1>
            <p className="text-sm text-slate-500">Registra entradas de inventario vinculadas a proveedores.</p>
          </div>
          <Button
            type="button"
            onClick={openCreateFlow}
            disabled={!canCreate || !companyId}
            className="bg-blue-600 text-white hover:bg-blue-500"
          >
            Registrar carga
          </Button>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-245 table-fixed">
            <colgroup>
              <col className="w-[42%]" />
              <col className="w-[26%]" />
              <col className="w-[20%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Total dispositivos</th>
                <th className="px-4 py-3 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
              {!loading && filteredLoads.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    No hay cargas registradas.
                  </td>
                </tr>
              )}

              {!loading &&
                filteredLoads.map((load) => (
                  <tr key={load.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      {supplierNameById.get(load.supplierId) ?? load.supplierName}
                    </td>
                    <td className="px-4 py-3">{formatDateTime(load.createdAt)}</td>
                    <td className="px-4 py-3">{totalDevicesForLoad(load.id)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        onClick={() => setDetailLoadId(load.id)}
                        className="border-slate-300 text-slate-700 hover:bg-slate-100"
                        icon={<Eye size={16} />}
                      >
                        <span className="sr-only">Ver detalle</span>
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={isModalOpen} onClose={closeCreateFlow} title="Registrar carga">
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <Field label="Proveedor">
            <button
              type="button"
              onClick={openSupplierModal}
              className="flex w-full items-center justify-between rounded-lg border-2 border-gray-400 bg-white px-3 py-3 text-left transition hover:border-blue-400"
            >
              <div className="flex flex-col">
                <span
                  className={`text-sm font-semibold ${
                    selectedSupplier ? "text-slate-800" : "text-slate-500"
                  }`}
                >
                  {selectedSupplier ? selectedSupplier.name : "Selecciona un proveedor"}
                </span>
                <span className="text-xs text-slate-500">
                  {selectedSupplier ? supplierMeta(selectedSupplier) : "Haz clic para elegir"}
                </span>
              </div>
              <span className="text-slate-400">{">"}</span>
            </button>
          </Field>

          <div className="flex items-end">
            <Button
              type="button"
              onClick={openProducts}
              disabled={!supplierId}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              {items.length > 0 ? `Editar (${items.length})` : "Seleccionar dispositivos"}
            </Button>
          </div>

          {items.length > 0 && (
            <div className="md:col-span-2 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
                <span>
                  <span className="font-semibold text-slate-800">{items.length}</span> productos -{" "}
                  <span className="font-semibold text-slate-800">{totalUnits}</span> unidades
                </span>
                <Button
                  type="button"
                  onClick={openProducts}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Ajustar productos
                </Button>
              </div>
              {items.map((item) => (
                <div
                  key={item.deviceId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-semibold text-slate-800">
                      {deviceNameById.get(item.deviceId) ?? "Dispositivo"}
                    </span>
                    <span className="ml-2 text-slate-500">
                      {deviceModelById.get(item.deviceId) ?? "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-800">Cantidad: {item.quantity}</span>
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

          {items.length === 0 && (
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={openProducts}
                disabled={!supplierId}
                className="flex w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500 transition hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {supplierId ? "Haz clic para agregar dispositivos" : "Selecciona un proveedor primero"}
              </button>
            </div>
          )}

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button
              type="button"
              onClick={closeCreateFlow}
              className="border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!canCreate || !companyId || submitting || items.length === 0 || !supplierId}
              className="bg-blue-600 text-white hover:bg-blue-500"
            >
              Registrar carga
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showSupplier}
        onClose={() => setShowSupplier(false)}
        title="Seleccionar proveedor"
        footer={
          <Button
            type="button"
            onClick={() => setShowSupplier(false)}
            className="border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            Cerrar
          </Button>
        }
      >
        <div className="space-y-3">
          <Input
            value={supplierSearch}
            onChange={(event) => setSupplierSearch(event.target.value)}
            placeholder="Buscar proveedor..."
          />
          <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-slate-200">
            {filteredSuppliers.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                No hay proveedores para esta busqueda.
              </div>
            )}
            {filteredSuppliers.map((supplier) => {
              const active = supplier.id === supplierId;
              return (
                <button
                  key={supplier.id}
                  type="button"
                  onClick={() => {
                    selectSupplier(supplier.id);
                    setShowSupplier(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 text-left text-sm transition last:border-b-0 ${
                    active ? "bg-blue-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <div className={`font-semibold ${active ? "text-blue-700" : "text-slate-800"}`}>
                      {supplier.name}
                    </div>
                    <div className="text-xs text-slate-500">{supplierMeta(supplier)}</div>
                  </div>
                  {active && (
                    <span className="rounded-full bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white">
                      Seleccionado
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
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

      <Modal
        open={Boolean(selectedDetailLoad)}
        onClose={() => setDetailLoadId(null)}
        title="Detalle de carga"
      >
        {selectedDetailLoad && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
              <div>
                <div className="font-semibold text-slate-800">
                  {supplierNameById.get(selectedDetailLoad.supplierId) ?? selectedDetailLoad.supplierName}
                </div>
                <div>{formatDateTime(selectedDetailLoad.createdAt)}</div>
              </div>
              <div className="font-semibold text-slate-800">
                {totalDevicesForLoad(selectedDetailLoad.id)} dispositivos
              </div>
            </div>
            <div className="max-h-[55vh] overflow-y-auto space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              {selectedDetailLoad.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-semibold text-slate-800">
                      {deviceNameById.get(item.deviceId) ?? item.deviceName}
                    </span>
                    <span className="ml-2 text-slate-500">
                      {deviceModelById.get(item.deviceId) ?? item.deviceModel}
                    </span>
                  </div>
                  <span className="font-semibold text-slate-800">{item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
