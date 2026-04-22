import { useState } from "react";
import Button from "../../components/Button";
import Input from "../../components/Input";
import useDeviceInventory from "../../hooks/useDeviceInventory";
import { downloadPDF } from "../../utils/reportPdf";

export default function DeviceInventory() {
  const {
    loading,
    searchTerm,
    filteredInventoryRows,
    canAdjust,
    submittingDeviceId,
    setSearchTerm,
    setExactQuantity,
  } = useDeviceInventory();
  const [exactQuantityByDevice, setExactQuantityByDevice] = useState<Record<string, string>>({});

  const handleDownload = () => {
    downloadPDF(filteredInventoryRows, 'device_inventory_report.pdf', ['deviceName', 'deviceModel', 'quantity', 'status']);
  };

  const statusClassByValue: Record<string, string> = {
    available: "border-emerald-200 bg-emerald-50 text-emerald-700",
    low_stock: "border-amber-200 bg-amber-50 text-amber-700",
    out_of_stock: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <section className="space-y-6">
      <header className="px-1 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-800">Inventario de dispositivos</h1>
          <p className="text-sm text-slate-500">
            Visualiza los dispositivos creados y ajusta su cantidad con acciones rapidas.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleDownload}
          className="bg-green-600 text-white hover:bg-green-500"
        >
          Descargar Reporte
        </Button>
      </header>

      <Input
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        maxLength={120}
        placeholder="Buscar por dispositivo, modelo, estado o cantidad..."
      />

      <div className="space-y-3">
        {!loading && filteredInventoryRows.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            No hay dispositivos para la busqueda.
          </div>
        )}

        {!loading &&
          filteredInventoryRows.map((row) => {
            const isSubmitting = submittingDeviceId === row.device.id;
            const rawDraft = exactQuantityByDevice[row.device.id];
            const draftQuantity =
              rawDraft === undefined || rawDraft === "" ? row.quantity : Math.max(0, Number(rawDraft) || 0);

            return (
              <article
                key={row.device.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-slate-800">{row.device.name}</h2>
                    <p className="text-sm text-slate-600">Modelo: {row.device.model}</p>
                    <p className="text-sm text-slate-600">Precio: USD {row.device.price.toFixed(2)}</p>
                    <p className="text-sm text-slate-500">
                      Estado:{" "}
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                          statusClassByValue[row.status] ?? "border-slate-200 bg-slate-100 text-slate-700"
                        }`}
                      >
                        {row.status}
                      </span>
                    </p>
                    <p className="text-sm text-slate-500">Cantidad actual: {row.quantity}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="relative flex items-center max-w-[11rem] rounded-md shadow-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setExactQuantityByDevice((current) => ({
                            ...current,
                            [row.device.id]: String(Math.max(0, draftQuantity - 1)),
                          }))
                        }
                        disabled={!canAdjust || isSubmitting || draftQuantity <= 0}
                        className="box-border h-10 rounded-s-md border border-slate-300 bg-slate-100 px-3 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                      >
                        <svg
                          className="h-4 w-4"
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 12h14"
                          />
                        </svg>
                      </button>

                      <input
                        type="text"
                        value={exactQuantityByDevice[row.device.id] ?? String(row.quantity)}
                        onChange={(event) =>
                          setExactQuantityByDevice((current) => ({
                            ...current,
                            [row.device.id]: event.target.value,
                          }))
                        }
                        className="h-10 w-full border-y border-slate-300 bg-slate-100 pb-6 text-center text-xs text-slate-800 outline-none"
                      />
{/* 
                      <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center space-x-1 text-xs text-slate-500">
                        <svg
                          className="h-3 w-3"
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M18 17v2M12 5.5V10m-6 7v2m15-2v-4c0-1.6569-1.3431-3-3-3H6c-1.65685 0-3 1.3431-3 3v4h18Zm-2-7V8c0-1.65685-1.3431-3-3-3H8C6.34315 5 5 6.34315 5 8v2h14Z"
                          />
                        </svg>
                        <span>Cantidad</span>
                      </div> */}

                      <button
                        type="button"
                        onClick={() =>
                          setExactQuantityByDevice((current) => ({
                            ...current,
                            [row.device.id]: String(draftQuantity + 1),
                          }))
                        }
                        disabled={!canAdjust || isSubmitting}
                        className="box-border h-10 rounded-e-md border border-slate-300 bg-slate-100 px-3 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                      >
                        <svg
                          className="h-4 w-4"
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 12h14m-7 7V5"
                          />
                        </svg>
                      </button>
                    </div>

                    <Button
                      type="button"
                      onClick={async () => {
                        const raw = exactQuantityByDevice[row.device.id] ?? String(row.quantity);
                        const parsed = Number(raw);
                        if (Number.isNaN(parsed) || parsed < 0) return;
                        await setExactQuantity(row.device.id, parsed);
                        setExactQuantityByDevice((current) => ({
                          ...current,
                          [row.device.id]: String(Math.max(0, parsed)),
                        }));
                      }}
                      disabled={!canAdjust || isSubmitting}
                      className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
      </div>
    </section>
  );
}
