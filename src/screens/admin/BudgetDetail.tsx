import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../../components/Button";
import Field from "../../components/Field";
import Modal from "../../components/Modal";
import FloorPlanEditor from "../../components/siteSurvey/FloorPlanEditor";
import { PERMISSIONS } from "../../constants/permissions";
import { useAuth } from "../../hooks/useAuth";
import { notifications } from "../../services/notification.service";
import {
  getBudgetDetail,
  replaceBudgetExtraCharges,
  replaceBudgetItems,
  saveBudgetDraft,
  updateBudgetStatus,
} from "../../services/budget.service";
import {
  createInstallationProject,
  getInstallationProjectByBudget,
} from "../../services/installation.service";
import { generateFormalQuote, getBudgetQuote, getQuotePdfUrl } from "../../services/quote.service";
import { getSurveyExecutionData } from "../../services/siteSurveyExecution.service";
import type {
  SurveyCatalogDevice,
  SurveyDeviceLayout,
  SurveyLayout,
  SurveyZoneOption,
} from "../../types/siteSurveyExecution.types";
import type {
  BudgetDetail as BudgetDetailType,
  BudgetExtraCharge,
  BudgetExtraChargeType,
} from "../../types/budget.types";
import type { BudgetQuote } from "../../types/quote.types";
import type { InstallationProject } from "../../services/installation.service";

type BudgetRow = {
  key: string;
  deviceId: string;
  deviceLabel: string;
  zoneId: string | null;
  zoneName: string;
  quantity: number;
  price: number;
  installationPrice: number;
};

type EditableExtraCharge = Pick<BudgetExtraCharge, "id" | "label" | "chargeType" | "amount">;

const DEFAULT_TAX_RATE = 0.18;
const DEFAULT_QUOTE_VALID_DAYS = 15;
const DEFAULT_QUOTE_TERMS =
  "Validez sujeta a disponibilidad. La instalacion se coordina con el cliente en un plazo de 10 dias habiles.";
const EXTRA_CHARGE_TYPE_OPTIONS: Array<{ value: BudgetExtraChargeType; label: string }> = [
  { value: "viaticos", label: "Viaticos" },
  { value: "transporte", label: "Transporte" },
  { value: "extra", label: "Extra" },
];

function toDateInput(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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
  const { companyProfile, authUser, canAccess } = useAuth();
  const companyId = companyProfile?.id ?? null;
  const userId = authUser?.id ?? null;
  const canUpdateBudget = canAccess(PERMISSIONS.budgetsUpdate);
  const canSendBudget = canAccess(PERMISSIONS.budgetsSend);
  const canCreateWorkOrder = canAccess(PERMISSIONS.workOrdersCreate);
  const canOpenInstallationProject = canAccess(PERMISSIONS.installationProjectsOpen);

  const [loadingSurvey, setLoadingSurvey] = useState(false);
  const [surveyError, setSurveyError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState("Sin cambios");

  const [budget, setBudget] = useState<BudgetDetailType | null>(null);
  const [layout, setLayout] = useState<SurveyLayout>({ walls: [], zones: [], devices: [] });
  const [zones, setZones] = useState<SurveyZoneOption[]>([]);
  const [devicesCatalog, setDevicesCatalog] = useState<SurveyCatalogDevice[]>([]);
  const [extraCharges, setExtraCharges] = useState<EditableExtraCharge[]>([]);
  const [notes, setNotes] = useState({
    requirements: "",
    observations: "",
    recomendations: "",
    risks: "",
  });
  const [taxRate, setTaxRate] = useState(DEFAULT_TAX_RATE);

  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [installationProject, setInstallationProject] = useState<InstallationProject | null>(null);
  const [installationSubmitting, setInstallationSubmitting] = useState(false);

  const [quote, setQuote] = useState<BudgetQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteValidUntil, setQuoteValidUntil] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + DEFAULT_QUOTE_VALID_DAYS);
    return toDateInput(date);
  });
  const [quoteTerms, setQuoteTerms] = useState(DEFAULT_QUOTE_TERMS);
  const [quotePdfUrl, setQuotePdfUrl] = useState<string | null>(null);
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);

  const layoutSignatureRef = useRef<string>("");
  const hydratedRef = useRef(false);

  const loadBudget = useCallback(async () => {
    if (!companyId || !budgetId) return;
    setLoadingSurvey(true);
    setSurveyError(null);

    try {
      const budgetDetail = await getBudgetDetail(budgetId, companyId);
      const [surveyData, projectData] = await Promise.all([
        getSurveyExecutionData(budgetDetail.surveyId, companyId),
        getInstallationProjectByBudget(budgetDetail.id, companyId),
      ]);

      setBudget(budgetDetail);
      setInstallationProject(projectData);
      setZones(surveyData.zones);
      setDevicesCatalog(surveyData.catalogDevices);
      setExtraCharges(
        budgetDetail.extraCharges.map((charge) => ({
          id: charge.id,
          label: charge.label,
          chargeType: charge.chargeType,
          amount: charge.amount,
        }))
      );
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
        devicesSubtotal: budgetDetail.devicesSubtotal,
        installationSubtotal: budgetDetail.installationSubtotal,
        extraChargesSubtotal: budgetDetail.extraChargesSubtotal,
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

  useEffect(() => {
    if (!companyId || !budgetId) return;
    setQuoteLoading(true);
    setQuoteError(null);

    getBudgetQuote(budgetId, companyId)
      .then(async (data) => {
        setQuote(data);
        if (data?.validUntil) {
          setQuoteValidUntil(toDateInput(data.validUntil));
        }
        if (data?.terms) {
          setQuoteTerms(data.terms);
        }
        if (data?.pdfPath) {
          const url = await getQuotePdfUrl(data.pdfPath);
          setQuotePdfUrl(url);
        }
      })
      .catch((err) => {
        setQuoteError(err instanceof Error ? err.message : "No se pudo cargar la cotizacion formal.");
      })
      .finally(() => setQuoteLoading(false));
  }, [budgetId, companyId]);


  const zoneById = useMemo(() => new Map(zones.map((zone) => [zone.id, zone])), [zones]);
  const deviceById = useMemo(() => new Map(devicesCatalog.map((device) => [device.id, device])), [devicesCatalog]);
  const pricingByKey = useMemo(() => {
    const map = new Map<string, { price: number; installationPrice: number }>();
    budget?.items.forEach((item) => {
      map.set(buildRowKey(item.deviceId, item.zoneId), {
        price: item.unitPrice,
        installationPrice: item.installationUnitPrice,
      });
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
      const storedPricing = pricingByKey.get(key);
      const price = storedPricing?.price ?? device?.price ?? 0;
      const installationPrice = storedPricing?.installationPrice ?? device?.installationPrice ?? 0;

      nextRows.push({
        key,
        deviceId: first.deviceId,
        deviceLabel: device?.label ?? first.label ?? "Dispositivo",
        zoneId: first.zoneId ?? null,
        zoneName: zone?.name ?? "Sin zona",
        quantity: devices.length,
        price,
        installationPrice,
      });
    });

    return nextRows.sort((a, b) => a.deviceLabel.localeCompare(b.deviceLabel));
  }, [deviceById, layout.devices, pricingByKey, zoneById]);

  const rowDeviceSubtotals = rows.map((row) => row.quantity * row.price);
  const rowInstallationSubtotals = rows.map((row) => row.quantity * row.installationPrice);
  const rowTotals = rows.map((_, index) => (rowDeviceSubtotals[index] ?? 0) + (rowInstallationSubtotals[index] ?? 0));
  const devicesSubtotal = rowDeviceSubtotals.reduce((acc, value) => acc + value, 0);
  const installationSubtotal = rowInstallationSubtotals.reduce((acc, value) => acc + value, 0);
  const extraChargesSubtotal = extraCharges.reduce((acc, charge) => acc + charge.amount, 0);
  const subtotal = devicesSubtotal + installationSubtotal + extraChargesSubtotal;
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;
  const canEditBudgetDraft = canUpdateBudget && budget?.status === "borrador" && !installationProject;

  const itemsForSave = useMemo(() => {
    return rows.map((row) => ({
      deviceId: row.deviceId,
      zoneId: row.zoneId,
      quantity: row.quantity,
      unitPrice: row.price,
      subtotal: row.quantity * row.price,
      installationUnitPrice: row.installationPrice,
      installationSubtotal: row.quantity * row.installationPrice,
    }));
  }, [rows]);

  const extraChargesForSave = useMemo(
    () =>
      extraCharges
        .map((charge, index) => ({
          label: charge.label.trim(),
          chargeType: charge.chargeType,
          amount: Math.max(0, charge.amount),
          itemOrder: index,
        }))
        .filter((charge) => charge.label.length > 0 || charge.amount > 0),
    [extraCharges]
  );

  useEffect(() => {
    if (!budget || !budgetId || !companyId || !canEditBudgetDraft) return;
    if (!hydratedRef.current) return;

    const signature = JSON.stringify(layout);
    const totalsSignature = JSON.stringify({
      devicesSubtotal,
      installationSubtotal,
      extraChargesSubtotal,
      subtotal,
      taxRate,
      taxAmount,
      total,
      extraCharges: extraChargesForSave,
    });
    const currentSignature = `${signature}::${totalsSignature}`;

    if (currentSignature === layoutSignatureRef.current) return;

    setSaveStatus("Guardando...");

    const timeoutId = window.setTimeout(() => {
      Promise.all([
        saveBudgetDraft({
          budgetId,
          layout,
          devicesSubtotal,
          installationSubtotal,
          extraChargesSubtotal,
          subtotal,
          taxRate,
          taxAmount,
          total,
        }),
        replaceBudgetItems(budgetId, itemsForSave),
        replaceBudgetExtraCharges(budgetId, companyId, extraChargesForSave),
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
  }, [
    budget,
    budgetId,
    canEditBudgetDraft,
    companyId,
    devicesSubtotal,
    extraChargesForSave,
    extraChargesSubtotal,
    installationSubtotal,
    itemsForSave,
    layout,
    subtotal,
    taxAmount,
    taxRate,
    total,
  ]);

  useEffect(() => {
    if (!budget || budget.status !== "enviada" || !budget.expiresAt) return;
    if (new Date(budget.expiresAt).getTime() > Date.now()) return;

    updateBudgetStatus({ budgetId: budget.id, status: "expirada" })
      .then(() => {
        setBudget((current) => (current ? { ...current, status: "expirada" } : current));
      })
      .catch(() => undefined);
  }, [budget]);

  const openInstallationModal = async () => {
    if (!canCreateWorkOrder) {
      notifications.warning({
        title: "Sin permisos",
        description: "No tienes permisos para crear ordenes de trabajo.",
      });
      return;
    }
    if (!budget) return;
    if (installationProject) {
      notifications.warning({
        title: "OT ya creada",
        description: "Este presupuesto ya tiene un proyecto de instalacion asociado.",
      });
      return;
    }

    setInstallModalOpen(true);
  };

  const handleCreateInstallation = async () => {
    if (!companyId || !budget) return;
    if (!canCreateWorkOrder) {
      notifications.warning({
        title: "Sin permisos",
        description: "No tienes permisos para crear ordenes de trabajo.",
      });
      return;
    }
    if (installationProject) {
      notifications.warning({
        title: "OT ya creada",
        description: "Ya existe un proyecto para este presupuesto.",
      });
      return;
    }

    setInstallationSubmitting(true);
    try {
      const result = await createInstallationProject({
        companyId,
        budgetId: budget.id,
      });

      const refreshed = await getInstallationProjectByBudget(budget.id, companyId);
      setInstallationProject(refreshed);

      notifications.success({
        title: result.created ? "Orden creada" : "Orden ya existente",
        description: result.created
          ? "Se creo el proyecto en estado pendiente. Ahora puedes abrirlo para programar visita y ejecutar tareas."
          : "El presupuesto ya tenia una OT creada. Se reutilizo la existente.",
      });
      setInstallModalOpen(false);
    } catch (err) {
      notifications.error({
        title: "Error creando orden",
        description: err instanceof Error ? err.message : "No se pudo crear la orden de trabajo.",
      });
    } finally {
      setInstallationSubmitting(false);
    }
  };

  const handleOpenInstallationProject = () => {
    if (!installationProject) return;
    if (!canOpenInstallationProject) {
      notifications.warning({
        title: "Sin permisos",
        description: "No tienes permisos para abrir proyectos de instalacion.",
      });
      return;
    }
    navigate(`/admin/installation-projects/${installationProject.id}`);
  };

  const handleGenerateQuote = async () => {
    if (!companyId || !budget || !userId) return;
    if (!canSendBudget) {
      notifications.warning({
        title: "Sin permisos",
        description: "No tienes permisos para generar y enviar cotizaciones.",
      });
      return;
    }
    if (installationProject) {
      notifications.warning({
        title: "Cotizacion bloqueada",
        description: "La OT ya fue creada. No se puede volver a generar o enviar la cotizacion.",
      });
      return;
    }
    setQuoteSubmitting(true);
    try {
      const validUntilIso = quoteValidUntil ? new Date(quoteValidUntil).toISOString() : null;
      const result = await generateFormalQuote({
        companyId,
        budgetId: budget.id,
        requestedByUserId: userId,
        validUntil: validUntilIso,
        terms: quoteTerms.trim() || null,
      });
      setQuote(result.quote);
      setQuotePdfUrl(result.pdfUrl);
      setBudget((current) =>
        current
          ? {
              ...current,
              status: "enviada",
              expiresAt: validUntilIso,
              sentAt: new Date().toISOString(),
            }
          : current
      );
      notifications.success({
        title: "Cotizacion generada",
        description: result.emailSent
          ? "PDF creado y enviado al cliente."
          : "PDF creado correctamente.",
      });
      if (result.warning) {
        notifications.warning({
          title: "Aviso",
          description: result.warning,
        });
      }
      if (result.pdfUrl) {
        window.open(result.pdfUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      notifications.error({
        title: "Error generando cotizacion",
        description: err instanceof Error ? err.message : "No se pudo generar la cotizacion formal.",
      });
    } finally {
      setQuoteSubmitting(false);
    }
  };

  const addExtraCharge = () => {
    setExtraCharges((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        label: "",
        chargeType: "extra",
        amount: 0,
      },
    ]);
  };

  const updateExtraCharge = (id: string, patch: Partial<EditableExtraCharge>) => {
    setExtraCharges((current) => current.map((charge) => (charge.id === id ? { ...charge, ...patch } : charge)));
  };

  const removeExtraCharge = (id: string) => {
    setExtraCharges((current) => current.filter((charge) => charge.id !== id));
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
                  onLayoutChange={canEditBudgetDraft ? setLayout : () => undefined}
                  onManualSave={() => undefined}
                  manualSaving={false}
                  autosaveLabel=""
                  showSave={false}
                  restrictToDevices
                  locked={!canEditBudgetDraft}
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
                <h3 className="text-sm font-semibold text-slate-900">Orden de trabajo</h3>
                <div className="mt-3 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Estado</span>
                    <span className="font-semibold text-slate-800">
                      {installationProject?.status ?? budget?.status ?? "borrador"}
                    </span>
                  </div>
                  {installationProject ? (
                    <p className="text-xs text-slate-500">
                      Proyecto #{installationProject.id.slice(0, 8)} · Visita{" "}
                      {installationProject.scheduledStart
                        ? new Date(installationProject.scheduledStart).toLocaleString("es-DO")
                        : "sin fecha"}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={openInstallationModal}
                      className="border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                      disabled={!canCreateWorkOrder || budget?.status !== "aprobada" || Boolean(installationProject) || installationSubmitting}
                    >
                      {installationSubmitting ? "Creando..." : installationProject ? "OT creada" : "Orden de trabajo"}
                    </Button>
                    {installationProject ? (
                      <Button
                        type="button"
                        onClick={handleOpenInstallationProject}
                        disabled={!canOpenInstallationProject}
                        className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                      >
                        Abrir proyecto
                      </Button>
                    ) : null}
                    {budget?.status !== "aprobada" ? (
                      <span className="text-xs text-slate-500">Disponible cuando la cotizacion este aprobada.</span>
                    ) : installationProject ? (
                      <span className="text-xs text-slate-500">La OT ya fue creada para este presupuesto.</span>
                    ) : null}
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Cotizacion formal</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Genera el PDF con logo, condiciones y validez. Se envia por email al cliente.
                </p>
                {installationProject ? (
                  <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    Cotizacion bloqueada: ya existe una OT creada para este presupuesto.
                  </p>
                ) : null}

                {quoteLoading ? (
                  <p className="mt-3 text-xs text-slate-500">Cargando cotizacion formal...</p>
                ) : quoteError ? (
                  <p className="mt-3 text-xs text-red-600">{quoteError}</p>
                ) : (
                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Numero</span>
                      <span className="font-semibold text-slate-800">{quote?.quoteNumber ?? "Pendiente"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Estado</span>
                      <span className="font-semibold text-slate-800">{quote?.status ?? "borrador"}</span>
                    </div>

                    <Field label="Valida hasta">
                      <input
                        type="date"
                        value={quoteValidUntil}
                        onChange={(event) => setQuoteValidUntil(event.target.value)}
                        disabled={!canSendBudget}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                      />
                    </Field>

                    <Field label="Condiciones">
                      <textarea
                        value={quoteTerms}
                        onChange={(event) => setQuoteTerms(event.target.value)}
                        disabled={!canSendBudget}
                        className="min-h-[90px] w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                      />
                    </Field>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={handleGenerateQuote}
                        disabled={!canSendBudget || quoteSubmitting || Boolean(installationProject)}
                        className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                      >
                        {quoteSubmitting ? "Generando..." : "Generar y enviar"}
                      </Button>
                      {quotePdfUrl ? (
                        <Button
                          type="button"
                          onClick={() => window.open(quotePdfUrl, "_blank", "noopener,noreferrer")}
                          className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        >
                          Ver PDF
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )}
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
                    <th className="px-3 py-2">Precio equipo</th>
                    <th className="px-3 py-2">Instalacion</th>
                    <th className="px-3 py-2">Total linea</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">
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
                        <td className="px-3 py-3 text-slate-600">{formatCurrency(row.installationPrice)}</td>
                        <td className="px-3 py-3 font-semibold text-slate-800">
                          {formatCurrency(rowTotals[index] ?? 0)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Cargos adicionales</h3>
                  <p className="text-xs text-slate-500">Agrega viaticos, transporte o extras antes de cotizar.</p>
                </div>
                {canEditBudgetDraft ? (
                  <Button
                    type="button"
                    onClick={addExtraCharge}
                    className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  >
                    Agregar cargo
                  </Button>
                ) : null}
              </div>

              <div className="mt-4 space-y-3">
                {extraCharges.length === 0 ? (
                  <p className="text-sm text-slate-500">No hay cargos adicionales.</p>
                ) : (
                  extraCharges.map((charge) => (
                    <div key={charge.id} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[1.2fr_0.8fr_0.6fr_auto]">
                      <Field label="Concepto">
                        <input
                          type="text"
                          value={charge.label}
                          onChange={(event) => updateExtraCharge(charge.id, { label: event.target.value })}
                          disabled={!canEditBudgetDraft}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                        />
                      </Field>
                      <Field label="Tipo">
                        <select
                          value={charge.chargeType}
                          onChange={(event) => updateExtraCharge(charge.id, { chargeType: event.target.value as BudgetExtraChargeType })}
                          disabled={!canEditBudgetDraft}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                        >
                          {EXTRA_CHARGE_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Monto">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={charge.amount}
                          onChange={(event) => updateExtraCharge(charge.id, { amount: Math.max(0, Number(event.target.value) || 0) })}
                          disabled={!canEditBudgetDraft}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                        />
                      </Field>
                      {canEditBudgetDraft ? (
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removeExtraCharge(charge.id)}
                            className="text-xs font-semibold text-red-600 hover:text-red-700"
                          >
                            Eliminar
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Equipos {formatCurrency(devicesSubtotal)} · Instalacion {formatCurrency(installationSubtotal)} · Extras {formatCurrency(extraChargesSubtotal)} · Impuestos {formatCurrency(taxAmount)} · Total {formatCurrency(total)}
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
                      disabled={!canEditBudgetDraft}
                      className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                    />
                    <span className="text-xs text-slate-500">%</span>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Equipos</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(devicesSubtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Instalacion</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(installationSubtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Extras</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(extraChargesSubtotal)}</span>
                  </div>
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

      <Modal
        open={installModalOpen}
        onClose={() => {
          if (installationSubmitting) return;
          setInstallModalOpen(false);
        }}
        title="Orden de trabajo"
        subtitle="Esta accion crea el proyecto en estado pendiente."
        footer={
          <>
            <Button
              type="button"
              onClick={() => setInstallModalOpen(false)}
              disabled={installationSubmitting}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreateInstallation}
              disabled={!canCreateWorkOrder || installationSubmitting}
              className="border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {installationSubmitting ? "Creando..." : "Crear orden"}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            Se creara la OT para este presupuesto y el proyecto quedara en <strong>pendiente</strong>.
          </p>
          <p>Luego podras abrir el proyecto para:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>programar/reprogramar/cancelar la visita tecnica</li>
            <li>asignar tecnico y fechas por tarea</li>
            <li>completar checklist de calidad y cerrar proyecto</li>
          </ul>
        </div>
      </Modal>

    </section>
  );
}
