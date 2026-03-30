import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../../components/Button";
import FloorPlanEditor from "../../components/siteSurvey/FloorPlanEditor";
import { useAuth } from "../../hooks/useAuth";
import { notifications } from "../../services/notification.service";
import {
  createBudgetApprovalLink,
  getBudgetDetail,
  replaceBudgetItems,
  saveBudgetDraft,
  updateBudgetStatus,
} from "../../services/budget.service";
import { getSurveyExecutionData } from "../../services/siteSurveyExecution.service";
import type {
  SurveyCatalogDevice,
  SurveyDeviceLayout,
  SurveyLayout,
  SurveyZoneOption,
} from "../../types/siteSurveyExecution.types";
import type { BudgetDetail as BudgetDetailType } from "../../types/budget.types";

type BudgetRow = {
  key: string;
  deviceId: string;
  deviceLabel: string;
  zoneId: string | null;
  zoneName: string;
  quantity: number;
  price: number;
};

const DEFAULT_TAX_RATE = 0.18;

function formatCurrency(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return safeValue.toLocaleString("es-DO", { style: "currency", currency: "USD" });
}

function buildRowKey(deviceId: string, zoneId: string | null): string {
  return `${deviceId}::${zoneId ?? "no-zone"}`;
}

function countDevicesByKey(devices: SurveyDeviceLayout[]): Map<string, SurveyDeviceLayout[]> {
  const grouped = new Map<string, SurveyDeviceLayout[]>();
  devices.forEach((device) => {
    const key = buildRowKey(device.deviceId, device.zoneId ?? null);
    const current = grouped.get(key) ?? [];
    current.push(device);
    grouped.set(key, current);
  });
  return grouped;
}

function cloneLayout(layout: SurveyLayout): SurveyLayout {
  return JSON.parse(JSON.stringify(layout)) as SurveyLayout;
}

export default function BudgetDetail() {
  const navigate = useNavigate();
  const { budgetId } = useParams<{ budgetId: string }>();
  const { companyProfile } = useAuth();
  const companyId = companyProfile?.id ?? null;

  const [loadingSurvey, setLoadingSurvey] = useState(false);
  const [surveyError, setSurveyError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState("Sin cambios");

  const [budget, setBudget] = useState<BudgetDetailType | null>(null);
  const [layout, setLayout] = useState<SurveyLayout>({ walls: [], zones: [], devices: [] });
  const [zones, setZones] = useState<SurveyZoneOption[]>([]);
  const [devicesCatalog, setDevicesCatalog] = useState<SurveyCatalogDevice[]>([]);
  const [notes, setNotes] = useState({
    requirements: "",
    observations: "",
    recomendations: "",
    risks: "",
  });
  const [taxRate, setTaxRate] = useState(DEFAULT_TAX_RATE);

  const [approvalLinkUrl, setApprovalLinkUrl] = useState<string | null>(null);
  const [linkDays, setLinkDays] = useState(7);

  const layoutSignatureRef = useRef<string>("");
  const hydratedRef = useRef(false);

  const loadBudget = useCallback(async () => {
    if (!companyId || !budgetId) return;
    setLoadingSurvey(true);
    setSurveyError(null);

    try {
      const budgetDetail = await getBudgetDetail(budgetId, companyId);
      const surveyData = await getSurveyExecutionData(budgetDetail.surveyId, companyId);

      setBudget(budgetDetail);
      setZones(surveyData.zones);
      setDevicesCatalog(surveyData.catalogDevices);
      setNotes({
        requirements: surveyData.survey.requirements ?? "",
        observations: surveyData.survey.observations ?? "",
        recomendations: surveyData.survey.recomendations ?? "",
        risks: surveyData.survey.risks ?? "",
      });

      const snapshot = cloneLayout(budgetDetail.layout ?? surveyData.survey.layout);
      setLayout(snapshot);
      setTaxRate(budgetDetail.taxRate ?? DEFAULT_TAX_RATE);
      layoutSignatureRef.current = `${JSON.stringify(snapshot)}::${JSON.stringify({
        subtotal: budgetDetail.subtotal,
        taxRate: budgetDetail.taxRate ?? DEFAULT_TAX_RATE,
        taxAmount: budgetDetail.taxAmount,
        total: budgetDetail.total,
      })}`;
      hydratedRef.current = true;
      setSaveStatus("Sin cambios");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo cargar el presupuesto.";
      setSurveyError(message);
    } finally {
      setLoadingSurvey(false);
    }
  }, [budgetId, companyId]);

  useEffect(() => {
    void loadBudget();
  }, [loadBudget]);

  const zoneById = useMemo(() => new Map(zones.map((zone) => [zone.id, zone])), [zones]);
  const deviceById = useMemo(() => new Map(devicesCatalog.map((device) => [device.id, device])), [devicesCatalog]);
  const priceByKey = useMemo(() => {
    const map = new Map<string, number>();
    budget?.items.forEach((item) => {
      map.set(buildRowKey(item.deviceId, item.zoneId), item.unitPrice);
    });
    return map;
  }, [budget?.items]);

  const rows = useMemo(() => {
    const grouped = countDevicesByKey(layout.devices);
    const nextRows: BudgetRow[] = [];

    grouped.forEach((devices, key) => {
      const first = devices[0];
      if (!first) return;
      const device = deviceById.get(first.deviceId);
      const zone = first.zoneId ? zoneById.get(first.zoneId) : null;
      const storedPrice = priceByKey.get(key);
      const price = storedPrice ?? device?.price ?? 0;

      nextRows.push({
        key,
        deviceId: first.deviceId,
        deviceLabel: device?.label ?? first.label ?? "Dispositivo",
        zoneId: first.zoneId ?? null,
        zoneName: zone?.name ?? "Sin zona",
        quantity: devices.length,
        price,
      });
    });

    return nextRows.sort((a, b) => a.deviceLabel.localeCompare(b.deviceLabel));
  }, [deviceById, layout.devices, priceByKey, zoneById]);

  const rowSubtotals = rows.map((row) => row.quantity * row.price);
  const subtotal = rowSubtotals.reduce((acc, value) => acc + value, 0);
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  const itemsForSave = useMemo(() => {
    return rows.map((row) => ({
      deviceId: row.deviceId,
      zoneId: row.zoneId,
      quantity: row.quantity,
      unitPrice: row.price,
      subtotal: row.quantity * row.price,
    }));
  }, [rows]);

  useEffect(() => {
    if (!budget || !budgetId) return;
    if (!hydratedRef.current) return;

    const signature = JSON.stringify(layout);
    const totalsSignature = JSON.stringify({ subtotal, taxRate, taxAmount, total });
    const currentSignature = `${signature}::${totalsSignature}`;

    if (currentSignature === layoutSignatureRef.current) return;

    setSaveStatus("Guardando...");

    const timeoutId = window.setTimeout(() => {
      Promise.all([
        saveBudgetDraft({
          budgetId,
          layout,
          subtotal,
          taxRate,
          taxAmount,
          total,
        }),
        replaceBudgetItems(budgetId, itemsForSave),
      ])
        .then(() => {
          layoutSignatureRef.current = currentSignature;
          setSaveStatus("Guardado");
        })
        .catch((err) => {
          setSaveStatus("Error al guardar");
          notifications.error({
            title: "Error guardando presupuesto",
            description: err instanceof Error ? err.message : "No se pudieron guardar los cambios.",
          });
        });
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [budget, budgetId, itemsForSave, layout, subtotal, taxAmount, taxRate, total]);

  useEffect(() => {
    if (!budget || budget.status !== "enviada" || !budget.expiresAt) return;
    if (new Date(budget.expiresAt).getTime() > Date.now()) return;

    updateBudgetStatus({ budgetId: budget.id, status: "expirada" })
      .then(() => {
        setBudget((current) => (current ? { ...current, status: "expirada" } : current));
      })
      .catch(() => undefined);
  }, [budget]);

  const handleGenerateLink = async () => {
    if (!budget) return;
    const expiresAt = new Date(Date.now() + linkDays * 24 * 60 * 60 * 1000).toISOString();
    try {
      const result = await createBudgetApprovalLink({ budgetId: budget.id, expiresAt });
      setApprovalLinkUrl(result.url);
      setBudget((current) =>
        current
          ? {
              ...current,
              status: "enviada",
              sentAt: new Date().toISOString(),
              expiresAt,
            }
          : current
      );
      notifications.success({
        title: "Link generado",
        description: "Se creo el link seguro de aprobacion.",
      });
    } catch (err) {
      notifications.error({
        title: "Error creando link",
        description: err instanceof Error ? err.message : "No se pudo generar el link.",
      });
    }
  };

  if (!budgetId) {
    return (
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">No se encontro el presupuesto solicitado.</p>
        <Button
          type="button"
          onClick={() => navigate("/admin/budgets")}
          className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
        >
          Volver al historial
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Button
              type="button"
              onClick={() => navigate("/admin/budgets")}
              className="border-white/20 bg-white text-slate-900 hover:bg-slate-100"
            >
              Volver al historial
            </Button>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Presupuesto</h1>
            <p className="mt-2 text-sm text-slate-200">
              Basado en el levantamiento de {budget?.customerName ?? "Cliente"} · {budget?.siteName ?? "Sitio"}.
            </p>
            <p className="mt-1 text-xs text-slate-300">Estado de guardado: {saveStatus}</p>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
              budget?.status === "aprobada"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : budget?.status === "rechazada"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : budget?.status === "expirada"
                    ? "border-slate-300 bg-slate-50 text-slate-600"
                    : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-current" />
            {budget?.status ?? "borrador"}
          </span>
        </div>
      </header>

      {surveyError ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {surveyError}
        </section>
      ) : loadingSurvey ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Cargando presupuesto...
        </section>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Plano / Diseño</h2>
              <p className="mt-1 text-xs text-slate-500">Solo puedes agregar sensores sobre el diseño existente.</p>
              <div className="mt-4">
                <FloorPlanEditor
                  surveyId={budget?.surveyId ?? ""}
                  layout={layout}
                  zonesCatalog={zones}
                  devicesCatalog={devicesCatalog}
                  onLayoutChange={setLayout}
                  onManualSave={() => undefined}
                  manualSaving={false}
                  autosaveLabel=""
                  showSave={false}
                  restrictToDevices
                />
              </div>
            </article>

            <aside className="space-y-4">
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Notas tecnicas</h3>
                <div className="mt-3 space-y-3 text-sm text-slate-600">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">Requerimientos</p>
                    <p className="mt-1">{notes.requirements || "Sin notas registradas."}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">Observaciones</p>
                    <p className="mt-1">{notes.observations || "Sin notas registradas."}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">Recomendaciones</p>
                    <p className="mt-1">{notes.recomendations || "Sin notas registradas."}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">Riesgos</p>
                    <p className="mt-1">{notes.risks || "Sin notas registradas."}</p>
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Aprobacion de cotizacion</h3>
                <div className="mt-3 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Estado</span>
                    <span className="font-semibold text-slate-800">{budget?.status ?? "borrador"}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-500">Expira en</label>
                    <select
                      value={linkDays}
                      onChange={(event) => setLinkDays(Number(event.target.value))}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700"
                    >
                      <option value={3}>3 dias</option>
                      <option value={7}>7 dias</option>
                      <option value={15}>15 dias</option>
                      <option value={30}>30 dias</option>
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={handleGenerateLink}
                      className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                      disabled={budget?.status === "aprobada" || budget?.status === "rechazada"}
                    >
                      Generar link seguro
                    </Button>
                  </div>

                  {approvalLinkUrl ? (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                      <p className="font-semibold">Link seguro generado:</p>
                      <p className="mt-1 break-all">{approvalLinkUrl}</p>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(approvalLinkUrl)}
                        className="mt-2 text-xs font-semibold text-blue-700"
                      >
                        Copiar link
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            </aside>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Detalle de presupuesto</h2>
              <p className="text-xs text-slate-500">Zonas, cantidades y precios se guardan automaticamente.</p>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Dispositivo</th>
                    <th className="px-3 py-2">Zona</th>
                    <th className="px-3 py-2">Cantidad</th>
                    <th className="px-3 py-2">Precio</th>
                    <th className="px-3 py-2">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-500">
                        No hay dispositivos cargados en el plano.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr key={row.key} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-3 py-3 font-medium text-slate-800">{row.deviceLabel}</td>
                        <td className="px-3 py-3 text-slate-600">{row.zoneName}</td>
                        <td className="px-3 py-3 text-slate-600">{row.quantity}</td>
                        <td className="px-3 py-3 text-slate-600">{formatCurrency(row.price)}</td>
                        <td className="px-3 py-3 font-semibold text-slate-800">
                          {formatCurrency(rowSubtotals[index] ?? 0)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Subtotal {formatCurrency(subtotal)} · Impuestos {formatCurrency(taxAmount)} · Total {formatCurrency(total)}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-slate-600">Tasa de impuestos</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={(taxRate * 100).toFixed(2)}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (Number.isNaN(next)) return;
                        setTaxRate(Math.max(0, next) / 100);
                      }}
                      className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                    />
                    <span className="text-xs text-slate-500">%</span>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Impuestos</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                    <span className="font-semibold text-slate-700">Total</span>
                    <span className="text-lg font-bold text-slate-900">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

    </section>
  );
}
