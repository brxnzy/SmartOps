import { useMemo, useState } from "react";
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
        onClick={() => onChange(Math.max(0, value - 1))}
        className="h-8 w-8 text-slate-500 hover:bg-slate-100"
      >
        -
      </button>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
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
  const [expandedLoadId, setExpandedLoadId] = useState<string | null>(null);
  const [showProducts, setShowProducts] = useState(false);
  const [search, setSearch] = useState("");
  const [draftLines, setDraftLines] = useState<Record<string, number>>({});

  const {
    loading,
    submitting,
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
  } = useInventoryLoads();

  const totalDevicesForLoad = (loadId: string) => {
    const load = filteredLoads.find((item) => item.id === loadId);
    if (!load) return 0;
    return load.items.reduce((acc, item) => acc + item.quantity, 0);
  };

  const filteredDevices = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return devices;
    return devices.filter((device) => {
      const text = `${device.name} ${device.model}`.toLowerCase();
      return text.includes(query);
    });
  }, [devices, search]);

  const openProducts = () => {
    const initial: Record<string, number> = {};
    items.forEach((item) => {
      initial[item.deviceId] = item.quantity;
    });
    setDraftLines(initial);
    setSearch("");
    setShowProducts(true);
  };

  const applyDraft = () => {
    const nextItems = Object.entries(draftLines)
      .filter(([, qty]) => qty > 0)
      .map(([deviceId, quantity]) => ({ deviceId, quantity }));
    setItemsBulk(nextItems);
    setShowProducts(false);
  };

  return (
    <section className="space-y-6">
      <header className="px-1">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-800">Registro de cargas</h1>
          <p className="text-sm text-slate-500">Registra entradas de inventario vinculadas a proveedores.</p>
        </div>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <Field label="Proveedor">
            <select
              value={supplierId}
              onChange={(event) => selectSupplier(event.target.value)}
              className="block w-full rounded-lg border-2 border-gray-400 bg-white px-3 py-3 focus:border-blue-500 focus:ring-blue-300 focus:outline-none"
            >
              <option value="">Selecciona un proveedor</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex items-end">
            <Button
              type="button"
              onClick={openProducts}
              disabled={!supplierId}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              Seleccionar dispositivos
            </Button>
          </div>

          {items.length > 0 && (
            <div className="md:col-span-2 space-y-2">
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

          <div className="md:col-span-2 flex justify-end">
            <Button
              type="submit"
              disabled={!canCreate || !companyId || submitting || items.length === 0 || !supplierId}
              className="bg-blue-600 text-white hover:bg-blue-500"
            >
              Registrar carga
            </Button>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-245 table-auto">
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
                filteredLoads.map((load) => {
                  const expanded = expandedLoadId === load.id;
                  return (
                    <tbody key={load.id} className="divide-y divide-slate-200">
                      <tr className="hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          {supplierNameById.get(load.supplierId) ?? load.supplierName}
                        </td>
                        <td className="px-4 py-3">{new Date(load.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">{totalDevicesForLoad(load.id)}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            onClick={() => setExpandedLoadId(expanded ? null : load.id)}
                            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          >
                            {expanded ? "Ocultar" : "Ver detalle"}
                          </Button>
                        </td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={4} className="bg-slate-50 px-4 py-3">
                            <div className="space-y-2">
                              {load.items.map((item) => (
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
                          </td>
                        </tr>
                      )}
                    </tbody>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={showProducts}
        onClose={() => setShowProducts(false)}
        title="Seleccionar dispositivos"
        footer={
          <>
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
          </>
        }
      >
        <div className="space-y-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar dispositivo..."
          />
          <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-slate-200">
            {filteredDevices.map((device) => {
              const qty = draftLines[device.id] ?? 0;
              return (
                <div
                  key={device.id}
                  className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-3 text-sm last:border-b-0"
                >
                  <div>
                    <div className="font-semibold text-slate-800">{device.name}</div>
                    <div className="text-xs text-slate-500">{device.model}</div>
                  </div>
                  <QtyInput
                    value={qty}
                    onChange={(value) =>
                      setDraftLines((current) => ({
                        ...current,
                        [device.id]: value,
                      }))
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      </Modal>
    </section>
  );
}
