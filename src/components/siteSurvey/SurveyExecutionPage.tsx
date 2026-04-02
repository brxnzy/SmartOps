import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Save } from "lucide-react";
import Button from "../Button";
import Modal from "../Modal";
import ChecklistPanel from "./ChecklistPanel";
import FloorPlanEditor from "./FloorPlanEditor";
import MediaPanel from "./MediaPanel";
import { PERMISSIONS } from "../../constants/permissions";
import { useAuth } from "../../hooks/useAuth";
import { notifications } from "../../services/notification.service";
import {
  finalizeSurveyExecution,
  getSurveyExecutionData,
  saveSurveyLayout,
  startSurveyVisit,
  updateSurveyForm,
} from "../../services/siteSurveyExecution.service";
import { canStartVisitStatus, isSurveyCompletedStatus, normalizeSurveyStatus, normalizeVisitStatus } from "../../utils/siteSurveyWorkflow";
import type {
  SurveyChecklistItem,
  SurveyLayout,
  SurveyMediaItem,
} from "../../types/siteSurveyExecution.types";

interface SurveyExecutionPageProps {
  surveyId: string;
  companyId: string;
  onBack: () => void;
}

interface FormValues {
  requirements: string;
  observations: string;
  recomendations: string;
  risks: string;
}

const EMPTY_FORM: FormValues = {
  requirements: "",
  observations: "",
  recomendations: "",
  risks: "",
};

function normalizeForm(values: FormValues): FormValues {
  return {
    requirements: values.requirements.trim(),
    observations: values.observations.trim(),
    recomendations: values.recomendations.trim(),
    risks: values.risks.trim(),
  };
}

export default function SurveyExecutionPage({ surveyId, companyId, onBack }: SurveyExecutionPageProps) {
  const { authUser, canAccess } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [surveyName, setSurveyName] = useState<string>("Levantamiento tecnico");
  const [visitId, setVisitId] = useState<string | null>(null);
  const [visitStatus, setVisitStatus] = useState<string | null>(null);
  const [visitTechnicianId, setVisitTechnicianId] = useState<string | null>(null);
  const [visitScheduledStart, setVisitScheduledStart] = useState<string | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);
  const [surveyStatus, setSurveyStatus] = useState<string | null>(null);

  const [formValues, setFormValues] = useState<FormValues>(EMPTY_FORM);
  const [layout, setLayout] = useState<SurveyLayout>({ walls: [], zones: [], devices: [] });
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [catalogDevices, setCatalogDevices] = useState<{ id: string; name: string; model: string; label: string }[]>([]);
  const [checklistItems, setChecklistItems] = useState<SurveyChecklistItem[]>([]);
  const [mediaItems, setMediaItems] = useState<SurveyMediaItem[]>([]);

  const [formStatus, setFormStatus] = useState<string>("Sin cambios");
  const [layoutStatus, setLayoutStatus] = useState<string>("Sin cambios");
  const [savingLayoutManual, setSavingLayoutManual] = useState(false);
  const [startingVisit, setStartingVisit] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [confirmFinalizeOpen, setConfirmFinalizeOpen] = useState(false);

  const formSignatureRef = useRef<string>(JSON.stringify(EMPTY_FORM));
  const layoutSignatureRef = useRef<string>(JSON.stringify({ walls: [], zones: [], devices: [] }));
  const hydratedRef = useRef(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getSurveyExecutionData(surveyId, companyId);

      setSurveyName(`${data.survey.customerName ?? "Cliente"} · ${data.survey.siteName ?? "Sitio"}`);
      setVisitId(data.visit?.id ?? null);
      setVisitStatus(normalizeVisitStatus(data.visit?.status));
      setVisitTechnicianId(data.visit?.technicianId ?? null);
      setVisitScheduledStart(data.visit?.scheduledStart ?? null);
      const normalizedStatus = normalizeSurveyStatus(data.survey.status);
      setSurveyStatus(normalizedStatus);
      setIsFinalized(
        isSurveyCompletedStatus(normalizedStatus) ||
        normalizedStatus === "cancelado" ||
        Boolean(data.survey.completedAt)
      );
      setZones(data.zones.map((zone) => ({ id: zone.id, name: zone.name })));
      setCatalogDevices(data.catalogDevices);
      setChecklistItems(data.checklistItems);
      setMediaItems(data.media);

      const formSeed: FormValues = {
        requirements: data.survey.requirements ?? "",
        observations: data.survey.observations ?? "",
        recomendations: data.survey.recomendations ?? "",
        risks: data.survey.risks ?? "",
      };

      setFormValues(formSeed);
      setLayout(data.survey.layout);

      formSignatureRef.current = JSON.stringify(normalizeForm(formSeed));
      layoutSignatureRef.current = JSON.stringify(data.survey.layout);
      setFormStatus("Sin cambios");
      setLayoutStatus("Sin cambios");
      hydratedRef.current = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cargar el levantamiento.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [companyId, surveyId]);

  useEffect(() => {
    hydratedRef.current = false;
    void loadData();
  }, [loadData]);

  const normalizedForm = useMemo(() => normalizeForm(formValues), [formValues]);
  const formSignature = useMemo(() => JSON.stringify(normalizedForm), [normalizedForm]);
  const layoutSignature = useMemo(() => JSON.stringify(layout), [layout]);
  const checkedChecklistCount = useMemo(
    () => checklistItems.filter((item) => item.checked).length,
    [checklistItems]
  );
  const userId = authUser?.id ?? null;
  const canStartSurvey = canAccess(PERMISSIONS.siteSurveyStart);
  const normalizedSurveyStatus = normalizeSurveyStatus(surveyStatus);
  const normalizedVisitStatus = normalizeVisitStatus(visitStatus);
  const isCancelled = surveyStatus === "cancelado";
  const showStartAction = !isFinalized && normalizedSurveyStatus === "pendiente";
  const canStartByTechnician = !visitTechnicianId || !userId || visitTechnicianId === userId;
  const canStartByDate = !visitScheduledStart || Date.now() >= new Date(visitScheduledStart).getTime();
  const canStartCurrentVisit =
    canStartSurvey &&
    !isCancelled &&
    !isFinalized &&
    Boolean(visitId) &&
    canStartVisitStatus(normalizedVisitStatus) &&
    canStartByTechnician &&
    canStartByDate;

  const persistFormNow = useCallback(async () => {
    if (formSignature === formSignatureRef.current) return;

    await updateSurveyForm(surveyId, {
      requirements: normalizedForm.requirements || null,
      observations: normalizedForm.observations || null,
      recomendations: normalizedForm.recomendations || null,
      risks: normalizedForm.risks || null,
    });

    formSignatureRef.current = formSignature;
    setFormStatus("Guardado");
  }, [formSignature, normalizedForm, surveyId]);

  const persistLayoutNow = useCallback(async () => {
    if (layoutSignature === layoutSignatureRef.current) return;

    await saveSurveyLayout(surveyId, layout);
    layoutSignatureRef.current = layoutSignature;
    setLayoutStatus("Guardado");
  }, [layout, layoutSignature, surveyId]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (formSignature === formSignatureRef.current) return;

    setFormStatus("Guardando...");

    const timeoutId = window.setTimeout(() => {
      void persistFormNow().catch((err) => {
        setFormStatus("Error al guardar");
        notifications.error({
          title: "Error guardando formulario",
          description: err instanceof Error ? err.message : "No se pudieron guardar los cambios del formulario.",
        });
      });
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [formSignature, persistFormNow]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (layoutSignature === layoutSignatureRef.current) return;

    setLayoutStatus("Guardando...");

    const timeoutId = window.setTimeout(() => {
      void persistLayoutNow().catch((err) => {
        setLayoutStatus("Error al guardar");
        notifications.error({
          title: "Error guardando plano",
          description: err instanceof Error ? err.message : "No se pudieron guardar los cambios del plano.",
        });
      });
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [layoutSignature, persistLayoutNow]);

  const handleManualLayoutSave = async () => {
    setSavingLayoutManual(true);
    try {
      await persistLayoutNow();
      notifications.success({
        title: "Plano guardado",
        description: "Se guardo el plano del levantamiento.",
      });
    } catch (err) {
      notifications.error({
        title: "Error guardando plano",
        description: err instanceof Error ? err.message : "No se pudo guardar el plano.",
      });
    } finally {
      setSavingLayoutManual(false);
    }
  };

  const handleStartVisit = async () => {
    if (!canStartSurvey) {
      notifications.warning({
        title: "Sin permisos",
        description: "No tienes permisos para iniciar levantamientos.",
      });
      return;
    }

    if (!visitId) {
      notifications.warning({
        title: "Visita requerida",
        description: "Este levantamiento no tiene visita tecnica programada.",
      });
      return;
    }

    if (!canStartByTechnician) {
      notifications.warning({
        title: "Tecnico no asignado",
        description: "Solo el tecnico asignado puede iniciar este levantamiento.",
      });
      return;
    }

    if (!canStartByDate) {
      notifications.warning({
        title: "Aun no disponible",
        description: "No puedes iniciar antes de la fecha/hora programada.",
      });
      return;
    }

    setStartingVisit(true);
    try {
      await startSurveyVisit(visitId, surveyId);
      setSurveyStatus("en_progreso");
      setVisitStatus("en_progreso");
      notifications.success({
        title: "Levantamiento iniciado",
        description: "La visita tecnica se marco en progreso.",
      });
    } catch (err) {
      notifications.error({
        title: "Error iniciando levantamiento",
        description: err instanceof Error ? err.message : "No se pudo iniciar el levantamiento.",
      });
    } finally {
      setStartingVisit(false);
    }
  };

  const finalize = async () => {
    if (isFinalized) {
      notifications.warning({
        title: "Levantamiento completado",
        description: "Este levantamiento ya fue finalizado.",
      });
      return;
    }

    if (checkedChecklistCount === 0) {
      notifications.warning({
        title: "Validacion pendiente",
        description: "Debes marcar al menos un item del checklist para finalizar.",
      });
      return;
    }

    if (!normalizedForm.observations || !normalizedForm.recomendations) {
      notifications.warning({
        title: "Notas requeridas",
        description: "Debes completar Observaciones y Recomendaciones para finalizar.",
      });
      return;
    }

    setFinalizing(true);
    try {
      await persistFormNow();
      await persistLayoutNow();
      await finalizeSurveyExecution(surveyId, visitId);
      setIsFinalized(true);
      setConfirmFinalizeOpen(false);
      notifications.success({
        title: "Levantamiento finalizado",
        description: "El levantamiento y la visita tecnica fueron completados.",
      });
      onBack();
    } catch (err) {
      notifications.error({
        title: "Error finalizando levantamiento",
        description: err instanceof Error ? err.message : "No se pudo finalizar el levantamiento.",
      });
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Cargando levantamiento tecnico...
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <p>{error}</p>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={onBack}
            className="border-red-300 bg-white text-red-700 hover:bg-red-100"
          >
            Volver
          </Button>
          <Button
            type="button"
            onClick={() => void loadData()}
            className="border-red-700 bg-red-700 text-white hover:bg-red-800"
          >
            Reintentar
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Ejecucion de levantamiento</p>
          <h1 className="text-xl font-semibold text-slate-900">{surveyName}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>Formulario: {formStatus}</span>
            <span>Plano: {layoutStatus}</span>
            <span>Checklist: {checklistItems.length} items</span>
            <span>Multimedia: {mediaItems.length} archivos</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={onBack}
            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            icon={<ArrowLeft size={14} />}
          >
            Volver a levantamientos
          </Button>

          <Button
            type="button"
            onClick={() => void persistFormNow()}
            disabled={isFinalized}
            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            icon={<Save size={14} />}
          >
            Guardar formulario
          </Button>

          {!isFinalized ? showStartAction ? (
            <Button
              type="button"
              onClick={() => void handleStartVisit()}
              disabled={startingVisit || !canStartCurrentVisit}
              className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
              icon={<CheckCircle2 size={14} />}
            >
              {startingVisit ? "Iniciando..." : "Iniciar levantamiento"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setConfirmFinalizeOpen(true)}
              disabled={finalizing}
              className="border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
              icon={<CheckCircle2 size={14} />}
            >
              {finalizing ? "Finalizando..." : "Finalizar levantamiento"}
            </Button>
          ) : (
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                isCancelled
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {isCancelled ? "Levantamiento cancelado" : "Levantamiento finalizado"}
            </span>
          )}
        </div>
      </header>

      <div className="space-y-4">
        <ChecklistPanel
          surveyId={surveyId}
          companyId={companyId}
          initialItems={checklistItems}
          onItemsChange={setChecklistItems}
        />

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Formulario tecnico</h3>
          <div className="mt-3 space-y-2">
            <label className="block text-xs font-medium text-slate-500">
              Riesgos
              <textarea
                value={formValues.risks}
                onChange={(event) => setFormValues((current) => ({ ...current, risks: event.target.value }))}
                disabled={isFinalized}
                className="mt-1 min-h-[90px] w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </label>

            <label className="block text-xs font-medium text-slate-500">
              Observaciones
              <textarea
                value={formValues.observations}
                onChange={(event) => setFormValues((current) => ({ ...current, observations: event.target.value }))}
                disabled={isFinalized}
                className="mt-1 min-h-[90px] w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </label>

            <label className="block text-xs font-medium text-slate-500">
              Requerimientos
              <textarea
                value={formValues.requirements}
                onChange={(event) => setFormValues((current) => ({ ...current, requirements: event.target.value }))}
                disabled={isFinalized}
                className="mt-1 min-h-[90px] w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </label>

            <label className="block text-xs font-medium text-slate-500">
              Recomendaciones
              <textarea
                value={formValues.recomendations}
                onChange={(event) => setFormValues((current) => ({ ...current, recomendations: event.target.value }))}
                disabled={isFinalized}
                className="mt-1 min-h-[90px] w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </label>
          </div>
        </article>

        <MediaPanel
          surveyId={surveyId}
          companyId={companyId}
          zones={zones.map((zone) => ({
            id: zone.id,
            name: zone.name,
            companyId,
            customerSiteId: "",
          }))}
          initialMedia={mediaItems}
          onMediaChange={setMediaItems}
        />

        <FloorPlanEditor
          surveyId={surveyId}
          layout={layout}
          zonesCatalog={zones.map((zone) => ({
            id: zone.id,
            name: zone.name,
            companyId,
            customerSiteId: "",
          }))}
          devicesCatalog={catalogDevices}
          onLayoutChange={isFinalized ? () => undefined : setLayout}
          onManualSave={() => {
            void handleManualLayoutSave();
          }}
          manualSaving={savingLayoutManual}
          autosaveLabel={layoutStatus}
          locked={isFinalized}
        />
      </div>

      <Modal
        open={confirmFinalizeOpen}
        onClose={() => {
          if (finalizing) return;
          setConfirmFinalizeOpen(false);
        }}
        title="Confirmar finalizacion"
        subtitle="Esta accion marcara el levantamiento y la visita tecnica como completados."
        footer={(
          <>
            <Button
              type="button"
              onClick={() => setConfirmFinalizeOpen(false)}
              disabled={finalizing}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void finalize()}
              disabled={finalizing}
              className="border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
              icon={<CheckCircle2 size={14} />}
            >
              {finalizing ? "Finalizando..." : "Confirmar y finalizar"}
            </Button>
          </>
        )}
      >
        <p className="text-sm text-slate-600">
          Para finalizar: marca al menos un item del checklist y completa Observaciones y Recomendaciones.
        </p>
      </Modal>
    </section>
  );
}
