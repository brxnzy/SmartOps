import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Button from "../../components/Button";
import Field from "../../components/Field";
import FloorPlanEditor from "../../components/siteSurvey/FloorPlanEditor";
import { useAuth } from "../../hooks/useAuth";
import { listCustomers } from "../../services/customers.service";
import { notifications } from "../../services/notification.service";
import { listCustomerSites, listSiteSurveys } from "../../services/siteSurvey.service";
import {
  EMPTY_SURVEY_LAYOUT,
  getSurveyExecutionData,
} from "../../services/siteSurveyExecution.service";
import type {
  SurveyCatalogDevice,
  SurveyDeviceLayout,
  SurveyLayout,
  SurveyZoneLayout,
  SurveyZoneOption,
} from "../../types/siteSurveyExecution.types";
import type { SiteSurveySummary, SimpleOption } from "../../types/siteSurvey.types";

type BudgetRow = {
  key: string;
  deviceId: string;
  deviceLabel: string;
  zoneId: string | null;
  zoneName: string;
  quantity: number;
  price: number;
  discount: number;
};

type PriceOverride = {
  price?: number;
  discount?: number;
};

const GRID = 24;
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

function computeDevicePosition(zone: SurveyZoneLayout, index: number) {
  const maxCols = Math.max(1, Math.floor(Math.max(zone.width - GRID, GRID) / GRID));
  const col = index % maxCols;
  const row = Math.floor(index / maxCols);
  const x = zone.x + GRID + col * GRID;
  const y = zone.y + GRID + row * GRID;
  return {
    x: Math.min(x, zone.x + zone.width - GRID),
    y: Math.min(y, zone.y + zone.height - GRID),
  };
}

function cloneLayout(layout: SurveyLayout): SurveyLayout {
  return JSON.parse(JSON.stringify(layout)) as SurveyLayout;
}

export default function BudgetBuilder() {
  const { companyProfile } = useAuth();
  const companyId = companyProfile?.id ?? null;

  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingSurvey, setLoadingSurvey] = useState(false);
  const [surveyError, setSurveyError] = useState<string | null>(null);

  const [customerOptions, setCustomerOptions] = useState<SimpleOption[]>([]);
  const [siteOptions, setSiteOptions] = useState<SimpleOption[]>([]);
  const [surveys, setSurveys] = useState<SiteSurveySummary[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [surveyId, setSurveyId] = useState("");

  const [layout, setLayout] = useState<SurveyLayout>(EMPTY_SURVEY_LAYOUT);
  const [zones, setZones] = useState<SurveyZoneOption[]>([]);
  const [devicesCatalog, setDevicesCatalog] = useState<SurveyCatalogDevice[]>([]);
  const [notes, setNotes] = useState({
    requirements: "",
    observations: "",
    recomendations: "",
    risks: "",
  });

  const [priceOverrides, setPriceOverrides] = useState<Record<string, PriceOverride>>({});
  const [taxRate, setTaxRate] = useState(DEFAULT_TAX_RATE);
  const [showTotals, setShowTotals] = useState(false);

  const [addDeviceId, setAddDeviceId] = useState("");
  const [addZoneId, setAddZoneId] = useState("");
  const [addQuantity, setAddQuantity] = useState("1");

  const initialLayoutRef = useRef<SurveyLayout>(EMPTY_SURVEY_LAYOUT);
  const initialLayoutSignatureRef = useRef<string>(JSON.stringify(EMPTY_SURVEY_LAYOUT));

  const loadOptions = useCallback(async () => {
    if (!companyId) return;
    setLoadingOptions(true);
    try {
      const [customers, siteSurveys] = await Promise.all([
        listCustomers(companyId, { page: 1, pageSize: 300 }),
        listSiteSurveys(companyId),
      ]);
      setCustomerOptions(customers.items.map((customer) => ({ id: customer.id, name: customer.name })));
      setSurveys(siteSurveys);
    } catch (error) {
      notifications.error({
        title: "Error cargando opciones",
        description: "No se pudieron cargar clientes y levantamientos.",
      });
      console.error(error);
    } finally {
      setLoadingOptions(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    if (!companyId || !customerId) {
      setSiteOptions([]);
      return;
    }

    let active = true;

    const loadSites = async () => {
      try {
        const sites = await listCustomerSites(companyId, customerId);
        if (!active) return;
        setSiteOptions(sites);
        if (sites.length === 0) {
          setSiteId("");
        } else if (!sites.some((site) => site.id === siteId)) {
          setSiteId(sites[0].id);
        }
      } catch (error) {
        if (!active) return;
        notifications.error({
          title: "Error cargando sitios",
          description: "No se pudieron cargar los sitios del cliente.",
        });
        console.error(error);
      }
    };

    void loadSites();

    return () => {
      active = false;
    };
  }, [companyId, customerId, siteId]);

  const surveyOptions = useMemo(() => {
    if (!customerId || !siteId) return [];
    return surveys.filter((survey) => survey.customerId === customerId && survey.siteId === siteId);
  }, [customerId, siteId, surveys]);

  useEffect(() => {
    if (!surveyOptions.some((survey) => survey.id === surveyId)) {
      setSurveyId(surveyOptions[0]?.id ?? "");
    }
  }, [surveyId, surveyOptions]);

  const loadSurveyData = useCallback(async () => {
    if (!companyId || !surveyId) return;

    setLoadingSurvey(true);
    setSurveyError(null);
    try {
      const data = await getSurveyExecutionData(surveyId, companyId);
      setZones(data.zones);
      setDevicesCatalog(data.catalogDevices);
      setNotes({
        requirements: data.survey.requirements ?? "",
        observations: data.survey.observations ?? "",
        recomendations: data.survey.recomendations ?? "",
        risks: data.survey.risks ?? "",
      });

      const snapshot = cloneLayout(data.survey.layout);
      initialLayoutRef.current = snapshot;
      initialLayoutSignatureRef.current = JSON.stringify(snapshot);
      setLayout(snapshot);
      setPriceOverrides({});
      setShowTotals(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo cargar el levantamiento.";
      setSurveyError(message);
    } finally {
      setLoadingSurvey(false);
    }
  }, [companyId, surveyId]);

  useEffect(() => {
    if (!surveyId) {
      setLayout(EMPTY_SURVEY_LAYOUT);
      setZones([]);
      setDevicesCatalog([]);
      setNotes({ requirements: "", observations: "", recomendations: "", risks: "" });
      setPriceOverrides({});
      setSurveyError(null);
      return;
    }

    void loadSurveyData();
  }, [loadSurveyData, surveyId]);

  useEffect(() => {
    if (devicesCatalog.length > 0 && !addDeviceId) {
      setAddDeviceId(devicesCatalog[0].id);
    }
  }, [addDeviceId, devicesCatalog]);

  useEffect(() => {
    if (zones.length > 0 && !addZoneId) {
      setAddZoneId(zones[0].id);
    }
  }, [addZoneId, zones]);

  const zoneOptionById = useMemo(() => new Map(zones.map((zone) => [zone.id, zone])), [zones]);
  const layoutZoneById = useMemo(() => new Map(layout.zones.map((zone) => [zone.id, zone])), [layout.zones]);
  const deviceById = useMemo(() => new Map(devicesCatalog.map((device) => [device.id, device])), [devicesCatalog]);

  const rows = useMemo(() => {
    const grouped = countDevicesByKey(layout.devices);
    const nextRows: BudgetRow[] = [];

    grouped.forEach((devices, key) => {
      const first = devices[0];
      if (!first) return;
      const device = deviceById.get(first.deviceId);
      const zoneOption = first.zoneId ? zoneOptionById.get(first.zoneId) : null;
      const layoutZone = first.zoneId ? layoutZoneById.get(first.zoneId) : null;
      const override = priceOverrides[key];
      const price = override?.price ?? device?.price ?? 0;
      const discount = override?.discount ?? 0;

      nextRows.push({
        key,
        deviceId: first.deviceId,
        deviceLabel: device?.label ?? first.label ?? "Dispositivo",
        zoneId: first.zoneId ?? null,
        zoneName: zoneOption?.name ?? layoutZone?.name ?? "Sin zona",
        quantity: devices.length,
        price,
        discount,
      });
    });

    return nextRows.sort((a, b) => a.deviceLabel.localeCompare(b.deviceLabel));
  }, [deviceById, layout.devices, layoutZoneById, priceOverrides, zoneOptionById]);

  useEffect(() => {
    setPriceOverrides((current) => {
      const validKeys = new Set(rows.map((row) => row.key));
      const next: Record<string, PriceOverride> = {};
      Object.entries(current).forEach(([key, override]) => {
        if (validKeys.has(key)) {
          next[key] = override;
        }
      });
      return next;
    });
  }, [rows]);

  const layoutSignature = useMemo(() => JSON.stringify(layout), [layout]);
  const hasOverrides = useMemo(
    () => Object.values(priceOverrides).some((override) => override.price !== undefined || override.discount !== undefined),
    [priceOverrides]
  );
  const isSynced = layoutSignature === initialLayoutSignatureRef.current && !hasOverrides;

  const updateLayoutDevices = (nextDevices: SurveyDeviceLayout[]) => {
    setLayout((current) => ({
      ...current,
      devices: nextDevices,
    }));
  };

  const adjustDeviceCount = useCallback(
    (deviceId: string, zoneId: string | null, nextCount: number) => {
      const normalizedCount = Math.max(0, Math.floor(nextCount));
      const devices = layout.devices.filter((device) => device.deviceId === deviceId && device.zoneId === zoneId);
      const otherDevices = layout.devices.filter((device) => !(device.deviceId === deviceId && device.zoneId === zoneId));

      if (normalizedCount === devices.length) return;

      if (normalizedCount < devices.length) {
        updateLayoutDevices([...otherDevices, ...devices.slice(0, normalizedCount)]);
        return;
      }

      const targetZone = zoneId ? layoutZoneById.get(zoneId) : null;
      if (!targetZone) {
        notifications.warning({
          title: "Zona requerida",
          description: "Selecciona una zona valida antes de agregar dispositivos.",
        });
        return;
      }

      const additions: SurveyDeviceLayout[] = [];
      for (let index = devices.length; index < normalizedCount; index += 1) {
        const position = computeDevicePosition(targetZone, index);
        additions.push({
          id: crypto.randomUUID(),
          deviceId,
          label: deviceById.get(deviceId)?.label ?? "Dispositivo",
          x: position.x,
          y: position.y,
          zoneId: targetZone.id,
        });
      }
      updateLayoutDevices([...otherDevices, ...devices, ...additions]);
    },
    [deviceById, layout.devices, layoutZoneById]
  );

  const moveDevicesToZone = useCallback(
    (deviceId: string, fromZoneId: string | null, toZoneId: string) => {
      const targetZone = layoutZoneById.get(toZoneId);
      if (!targetZone) return;

      const moving = layout.devices.filter((device) => device.deviceId === deviceId && device.zoneId === fromZoneId);
      const rest = layout.devices.filter((device) => !(device.deviceId === deviceId && device.zoneId === fromZoneId));

      const relocated = moving.map((device, index) => {
        const position = computeDevicePosition(targetZone, index);
        return {
          ...device,
          zoneId: targetZone.id,
          x: position.x,
          y: position.y,
        };
      });

      updateLayoutDevices([...rest, ...relocated]);
    },
    [layout.devices, layoutZoneById]
  );

  const removeRow = useCallback(
    (deviceId: string, zoneId: string | null) => {
      const remaining = layout.devices.filter((device) => !(device.deviceId === deviceId && device.zoneId === zoneId));
      updateLayoutDevices(remaining);
    },
    [layout.devices]
  );

  const handleAddRow = () => {
    const quantity = Math.max(1, Number(addQuantity) || 1);
    if (!addDeviceId || !addZoneId) {
      notifications.warning({
        title: "Datos requeridos",
        description: "Selecciona dispositivo y zona para agregar.",
      });
      return;
    }

    const key = buildRowKey(addDeviceId, addZoneId);
    const existing = layout.devices.filter((device) => device.deviceId === addDeviceId && device.zoneId === addZoneId);
    adjustDeviceCount(addDeviceId, addZoneId, existing.length + quantity);
    setPriceOverrides((current) => ({
      ...current,
      [key]: current[key] ?? {},
    }));
  };

  const handleResync = () => {
    setLayout(cloneLayout(initialLayoutRef.current));
    setPriceOverrides({});
    setShowTotals(false);
  };

  const rowSubtotals = rows.map((row) => {
    const discountFactor = Math.max(0, Math.min(100, row.discount)) / 100;
    return row.quantity * row.price * (1 - discountFactor);
  });

  const subtotal = rowSubtotals.reduce((acc, value) => acc + value, 0);
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  const selectedSurvey = surveys.find((survey) => survey.id === surveyId);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Generacion de presupuesto</h1>
            <p className="text-sm text-slate-500">
              Selecciona el levantamiento y construye el presupuesto conectado al plano.
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
              isSynced
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isSynced ? "bg-emerald-500" : "bg-amber-500"}`} />
            {isSynced ? "Sincronizado con dise�o" : "Modificado manualmente"}
          </span>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Cliente">
            <select
              value={customerId}
              onChange={(event) => {
                setCustomerId(event.target.value);
                setSiteId("");
                setSurveyId("");
              }}
              disabled={loadingOptions}
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Selecciona un cliente</option>
              {customerOptions.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Sitio">
            <select
              value={siteId}
              onChange={(event) => {
                setSiteId(event.target.value);
                setSurveyId("");
              }}
              disabled={loadingOptions || !customerId}
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Selecciona un sitio</option>
              {siteOptions.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Levantamiento (obligatorio)">
            <select
              value={surveyId}
              onChange={(event) => setSurveyId(event.target.value)}
              disabled={loadingOptions || !customerId || !siteId}
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Selecciona un levantamiento</option>
              {surveyOptions.map((survey) => (
                <option key={survey.id} value={survey.id}>
                  {survey.customerName ?? "Cliente"} � {survey.siteName ?? "Sitio"} � {survey.status ?? "Pendiente"}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {surveyError && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {surveyError}
          </div>
        )}
      </section>

      {!surveyId ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
          Sin levantamiento seleccionado no se puede generar presupuesto.
        </section>
      ) : loadingSurvey ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Cargando levantamiento y plano...
        </section>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Plano / Dise�o</h2>
              <p className="mt-1 text-xs text-slate-500">
                Plano 2D con zonas y dispositivos posicionados. Arrastra o agrega equipos desde el catalogo.
              </p>
              <div className="mt-4">
                <FloorPlanEditor
                  surveyId={surveyId}
                  layout={layout}
                  zonesCatalog={zones}
                  devicesCatalog={devicesCatalog}
                  onLayoutChange={setLayout}
                  onManualSave={() => {
                    notifications.info({
                      title: "Plano actualizado",
                      description: "Los cambios del plano se reflejan en el presupuesto.",
                    });
                  }}
                  manualSaving={false}
                  autosaveLabel="Plano sincronizado"
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
                <h3 className="text-sm font-semibold text-slate-900">Resumen del levantamiento</h3>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>
                    <span className="font-medium text-slate-700">Cliente:</span> {selectedSurvey?.customerName ?? "Sin nombre"}
                  </p>
                  <p>
                    <span className="font-medium text-slate-700">Sitio:</span> {selectedSurvey?.siteName ?? "Sin nombre"}
                  </p>
                  <p>
                    <span className="font-medium text-slate-700">Estado:</span> {selectedSurvey?.status ?? "Pendiente"}
                  </p>
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Acciones principales</h3>
                <div className="mt-3 flex flex-col gap-2">
                  <Button
                    type="button"
                    onClick={() => setShowTotals(true)}
                    className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Generar calculo
                  </Button>
                  <Button
                    type="button"
                    onClick={handleResync}
                    className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  >
                    Re-sincronizar con dise�o
                  </Button>
                  <Button
                    type="button"
                    onClick={() =>
                      notifications.info({
                        title: "Conversion pendiente",
                        description: "La conversion a cotizacion se agregara en la siguiente iteracion.",
                      })
                    }
                    className="border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Convertir a cotizacion
                  </Button>
                </div>
              </article>
            </aside>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Detalle de dispositivos</h2>
                <p className="text-xs text-slate-500">
                  La tabla refleja el dise�o. Cambia cantidades, zona, precio o descuento.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto]">
              <Field label="Agregar dispositivo">
                <select
                  value={addDeviceId}
                  onChange={(event) => setAddDeviceId(event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Selecciona un dispositivo</option>
                  {devicesCatalog.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Zona">
                <select
                  value={addZoneId}
                  onChange={(event) => setAddZoneId(event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Selecciona una zona</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Cantidad">
                <input
                  type="number"
                  min={1}
                  value={addQuantity}
                  onChange={(event) => setAddQuantity(event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                />
              </Field>
              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={handleAddRow}
                  className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                >
                  Agregar
                </Button>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Dispositivo</th>
                    <th className="px-3 py-2">Zona</th>
                    <th className="px-3 py-2">Cantidad</th>
                    <th className="px-3 py-2">Precio</th>
                    <th className="px-3 py-2">Descuento %</th>
                    <th className="px-3 py-2">Subtotal</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">
                        No hay dispositivos cargados en el plano.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr key={row.key} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-3 py-3 font-medium text-slate-800">{row.deviceLabel}</td>
                        <td className="px-3 py-3">
                          <select
                            value={row.zoneId ?? ""}
                            onChange={(event) => {
                              const nextZoneId = event.target.value;
                              if (!nextZoneId) return;
                              moveDevicesToZone(row.deviceId, row.zoneId, nextZoneId);
                              setPriceOverrides((current) => {
                                const next = { ...current };
                                const previous = next[row.key];
                                delete next[row.key];
                                const nextKey = buildRowKey(row.deviceId, nextZoneId);
                                if (previous) {
                                  next[nextKey] = previous;
                                }
                                return next;
                              });
                            }}
                            className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                          >
                            <option value="">Sin zona</option>
                            {zones.map((zone) => (
                              <option key={zone.id} value={zone.id}>
                                {zone.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min={0}
                            value={row.quantity}
                            onChange={(event) => adjustDeviceCount(row.deviceId, row.zoneId, Number(event.target.value))}
                            className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={row.price}
                            onChange={(event) => {
                              const nextPrice = Number(event.target.value);
                              setPriceOverrides((current) => ({
                                ...current,
                                [row.key]: {
                                  ...current[row.key],
                                  price: Number.isNaN(nextPrice) ? undefined : nextPrice,
                                },
                              }));
                            }}
                            className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={row.discount}
                            onChange={(event) => {
                              const nextDiscount = Number(event.target.value);
                              setPriceOverrides((current) => ({
                                ...current,
                                [row.key]: {
                                  ...current[row.key],
                                  discount: Number.isNaN(nextDiscount) ? 0 : nextDiscount,
                                },
                              }));
                            }}
                            className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-3 font-semibold text-slate-800">
                          {formatCurrency(rowSubtotals[index] ?? 0)}
                        </td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => {
                              removeRow(row.deviceId, row.zoneId);
                              setPriceOverrides((current) => {
                                const next = { ...current };
                                delete next[row.key];
                                return next;
                              });
                            }}
                            className="text-xs font-semibold text-red-600 hover:text-red-700"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                {showTotals ? (
                  <p>
                    Calculo actualizado. Subtotal {formatCurrency(subtotal)} � Impuestos {formatCurrency(taxAmount)} �
                    Total {formatCurrency(total)}
                  </p>
                ) : (
                  <p>Presiona "Generar calculo" para fijar el resumen del presupuesto.</p>
                )}
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
