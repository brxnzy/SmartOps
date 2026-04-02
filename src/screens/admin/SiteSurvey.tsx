import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarClock, ClipboardCheck, Plus, UserRound } from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import Field from "../../components/Field";
import Modal from "../../components/Modal";
import { PERMISSIONS } from "../../constants/permissions";
import { useAuth } from "../../hooks/useAuth";
import { listCustomers } from "../../services/customers.service";
import { notifications } from "../../services/notification.service";
import {
  createSiteSurvey,
  listCustomerSites,
  listSiteSurveys,
} from "../../services/siteSurvey.service";
import {
  cancelSiteSurvey,
  cancelTechnicalVisit,
  rescheduleTechnicalVisit,
} from "../../services/siteSurveyExecution.service";
import { listUsers } from "../../services/users.service";
import SurveyExecutionPage from "../../components/siteSurvey/SurveyExecutionPage";
import type { SiteSurveySummary, SimpleOption } from "../../types/siteSurvey.types";
import {
  canCancelSurveyStatus,
  canCancelVisitStatus,
  canRescheduleVisitStatus,
  formatSurveyStatusLabel,
  formatVisitStatusLabel,
  isSurveyCompletedStatus,
  normalizeSurveyStatus,
  normalizeVisitStatus,
} from "../../utils/siteSurveyWorkflow";

const STATUS_STYLES: Record<string, string> = {
  pendiente: "border-amber-200 bg-amber-50 text-amber-700",
  en_progreso: "border-blue-200 bg-blue-50 text-blue-700",
  completado: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelado: "border-rose-200 bg-rose-50 text-rose-700",
};

function formatDateTime(value?: string | null): string {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString("es-DO");
}

function toDateTimeLocalValue(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function isCompleted(survey: SiteSurveySummary): boolean {
  return isSurveyCompletedStatus(survey.status) || Boolean(survey.completedAt);
}

export default function SiteSurvey() {
  const navigate = useNavigate();
  const { surveyId } = useParams();
  const { authUser, companyProfile, canAccess } = useAuth();

  const companyId = companyProfile?.id ?? null;
  const userId = authUser?.id ?? null;
  const canCreate = canAccess(PERMISSIONS.siteSurveyCreate);
  const canCancelVisit = canAccess(PERMISSIONS.technicalVisitsCancel);
  const canRescheduleVisit = canAccess(PERMISSIONS.technicalVisitsReschedule);
  const canCancelSurvey = canAccess(PERMISSIONS.siteSurveyCancel);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [surveys, setSurveys] = useState<SiteSurveySummary[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [customerOptions, setCustomerOptions] = useState<SimpleOption[]>([]);
  const [siteOptions, setSiteOptions] = useState<SimpleOption[]>([]);
  const [technicianOptions, setTechnicianOptions] = useState<SimpleOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const [cancelingSurveyId, setCancelingSurveyId] = useState<string | null>(null);
  const [cancelingSiteSurveyId, setCancelingSiteSurveyId] = useState<string | null>(null);
  const [reschedulingSurveyId, setReschedulingSurveyId] = useState<string | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<SiteSurveySummary | null>(null);
  const [rescheduleStart, setRescheduleStart] = useState("");
  const [rescheduleEnd, setRescheduleEnd] = useState("");

  const [formValues, setFormValues] = useState({
    customerId: "",
    siteId: "",
    technicianId: "",
    scheduledStart: toDateTimeLocalValue(new Date().toISOString()),
    scheduledEnd: "",
  });

  const loadSurveys = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      setSurveys([]);
      setError("No se encontro la compania activa.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await listSiteSurveys(companyId);
      setSurveys(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudieron cargar los levantamientos.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const loadCreateOptions = useCallback(async () => {
    if (!companyId) return;

    setOptionsLoading(true);
    try {
      const [customers, users] = await Promise.all([
        listCustomers(companyId, { page: 1, pageSize: 300 }),
        listUsers(companyId, { page: 1, pageSize: 300 }),
      ]);

      setCustomerOptions(customers.items.map((customer) => ({ id: customer.id, name: customer.name })));

      const technicianMap = new Map<string, SimpleOption>();
      users.items
        .filter((user) => user.roleName?.trim().toLowerCase() !== "customer")
        .forEach((user) => {
          if (!technicianMap.has(user.id)) {
            technicianMap.set(user.id, { id: user.id, name: user.name });
          }
        });

      setTechnicianOptions(Array.from(technicianMap.values()));
    } catch {
      notifications.error({
        title: "Error cargando opciones",
        description: "No se pudieron cargar clientes y tecnicos.",
      });
    } finally {
      setOptionsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadSurveys();
  }, [loadSurveys]);

  useEffect(() => {
    if (!createOpen) return;
    void loadCreateOptions();
  }, [createOpen, loadCreateOptions]);

  useEffect(() => {
    if (!companyId || !formValues.customerId || !createOpen) {
      setSiteOptions([]);
      return;
    }

    let active = true;

    const loadSites = async () => {
      try {
        const sites = await listCustomerSites(companyId, formValues.customerId);
        if (!active) return;
        setSiteOptions(sites);

        if (sites.length === 0) {
          setFormValues((current) => ({ ...current, siteId: "" }));
        } else if (!sites.some((site) => site.id === formValues.siteId)) {
          setFormValues((current) => ({ ...current, siteId: sites[0].id }));
        }
      } catch {
        if (!active) return;
        notifications.error({
          title: "Error cargando sitios",
          description: "No se pudieron cargar los sitios del cliente.",
        });
      }
    };

    void loadSites();

    return () => {
      active = false;
    };
  }, [companyId, createOpen, formValues.customerId, formValues.siteId]);

  const stats = useMemo(() => {
    const total = surveys.length;
    const completed = surveys.filter((survey) => isCompleted(survey)).length;
    const inProgress = surveys.filter((survey) => normalizeSurveyStatus(survey.status) === "en_progreso").length;
    const canceled = surveys.filter((survey) => normalizeSurveyStatus(survey.status) === "cancelado").length;
    const pending = total - completed - inProgress - canceled;
    return { total, pending, inProgress, completed, canceled };
  }, [surveys]);

  const openCreateModal = () => {
    setFormValues({
      customerId: "",
      siteId: "",
      technicianId: "",
      scheduledStart: toDateTimeLocalValue(new Date().toISOString()),
      scheduledEnd: "",
    });
    setCreateOpen(true);
  };

  const handleCancelVisit = async (survey: SiteSurveySummary) => {
    if (!canCancelVisit) {
      notifications.warning({
        title: "Sin permisos",
        description: "No tienes permisos para cancelar visitas tecnicas.",
      });
      return;
    }

    if (!survey.visitId) {
      notifications.warning({
        title: "Sin visita tecnica",
        description: "Este levantamiento no tiene una visita tecnica para cancelar.",
      });
      return;
    }

    const confirmed = window.confirm(
      "Se cancelara solo la visita tecnica. El levantamiento seguira activo. Deseas continuar?"
    );
    if (!confirmed) return;

    setCancelingSurveyId(survey.id);
    try {
      await cancelTechnicalVisit(survey.visitId);
      notifications.success({
        title: "Visita cancelada",
        description: "La visita tecnica fue cancelada. El levantamiento sigue activo.",
      });
      await loadSurveys();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cancelar la visita tecnica.";
      notifications.error({
        title: "Error cancelando visita",
        description: message,
      });
      window.alert(message);
    } finally {
      setCancelingSurveyId(null);
    }
  };

  const handleCancelSiteSurvey = async (survey: SiteSurveySummary) => {
    if (!canCancelSurvey) {
      notifications.warning({
        title: "Sin permisos",
        description: "No tienes permisos para cancelar levantamientos.",
      });
      return;
    }

    if (!canCancelSurveyStatus(survey.status)) {
      notifications.warning({
        title: "Estado no valido",
        description: "Solo puedes cancelar levantamientos pendientes o en progreso.",
      });
      return;
    }

    const confirmed = window.confirm(
      "Al cancelar el levantamiento, se cancelaran sus visitas tecnicas pendientes/en progreso. Deseas continuar?"
    );
    if (!confirmed) return;

    setCancelingSiteSurveyId(survey.id);
    try {
      await cancelSiteSurvey(survey.id);
      notifications.success({
        title: "Levantamiento cancelado",
        description: "El levantamiento y sus visitas activas fueron cancelados.",
      });
      await loadSurveys();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cancelar el levantamiento.";
      notifications.error({
        title: "Error cancelando levantamiento",
        description: message,
      });
      window.alert(message);
    } finally {
      setCancelingSiteSurveyId(null);
    }
  };

  const openRescheduleModal = (survey: SiteSurveySummary) => {
    if (!survey.visitId) return;
    setRescheduleTarget(survey);
    setRescheduleStart(toDateTimeLocalValue(survey.scheduledStart));
    setRescheduleEnd(toDateTimeLocalValue(survey.scheduledEnd));
    setRescheduleOpen(true);
  };

  const closeRescheduleModal = () => {
    if (reschedulingSurveyId) return;
    setRescheduleOpen(false);
    setRescheduleTarget(null);
    setRescheduleStart("");
    setRescheduleEnd("");
  };

  const handleRescheduleVisit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canRescheduleVisit) {
      notifications.warning({
        title: "Sin permisos",
        description: "No tienes permisos para reprogramar visitas tecnicas.",
      });
      return;
    }

    if (!rescheduleTarget?.visitId || !rescheduleStart) {
      notifications.warning({
        title: "Campos requeridos",
        description: "Debes indicar la nueva fecha de inicio de la visita.",
      });
      return;
    }

    const scheduledStart = new Date(rescheduleStart).toISOString();
    const scheduledEnd = rescheduleEnd ? new Date(rescheduleEnd).toISOString() : null;
    if (scheduledEnd && Date.parse(scheduledEnd) <= Date.parse(scheduledStart)) {
      notifications.warning({
        title: "Rango invalido",
        description: "La fecha/hora fin debe ser mayor a la fecha/hora inicio.",
      });
      return;
    }

    setReschedulingSurveyId(rescheduleTarget.id);
    try {
      await rescheduleTechnicalVisit({
        visitId: rescheduleTarget.visitId,
        scheduledStart,
        scheduledEnd,
      });
      notifications.success({
        title: "Visita reprogramada",
        description: "La visita tecnica fue reprogramada correctamente.",
      });
      closeRescheduleModal();
      await loadSurveys();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo reprogramar la visita tecnica.";
      notifications.error({
        title: "Error reprogramando visita",
        description: message,
      });
      window.alert(message);
    } finally {
      setReschedulingSurveyId(null);
    }
  };

  const closeCreateModal = () => {
    if (creating) return;
    setCreateOpen(false);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!companyId) return;
    if (!canCreate) {
      notifications.warning({
        title: "Sin permisos",
        description: "No tienes permisos para crear levantamientos.",
      });
      return;
    }

    if (!formValues.customerId || !formValues.siteId || !formValues.technicianId || !formValues.scheduledStart) {
      notifications.warning({
        title: "Campos requeridos",
        description: "Completa cliente, sitio, tecnico y fecha/hora de inicio.",
      });
      return;
    }

    const scheduledStart = new Date(formValues.scheduledStart).toISOString();
    const scheduledEnd = formValues.scheduledEnd ? new Date(formValues.scheduledEnd).toISOString() : null;

    if (scheduledEnd && new Date(scheduledEnd).getTime() <= new Date(scheduledStart).getTime()) {
      notifications.warning({
        title: "Rango invalido",
        description: "La hora fin debe ser mayor a la hora inicio.",
      });
      return;
    }

    setCreating(true);
    try {
      await createSiteSurvey(companyId, {
        customerId: formValues.customerId,
        siteId: formValues.siteId,
        technicianId: formValues.technicianId,
        scheduledStart,
        scheduledEnd,
      });

      notifications.success({
        title: "Levantamiento creado",
        description: "Se registro y agendo correctamente.",
      });

      setCreateOpen(false);
      await loadSurveys();
    } catch (err) {
      notifications.error({
        title: "Error creando levantamiento",
        description: err instanceof Error ? err.message : "No se pudo crear el levantamiento.",
      });
    } finally {
      setCreating(false);
    }
  };

  if (!companyId || !userId) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (surveyId) {
    return <SurveyExecutionPage surveyId={surveyId} companyId={companyId} onBack={() => navigate("/admin/site_surveys")} />;
  }

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-linear-to-r from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight">Levantamientos</h1>
        <p className="mt-2 text-sm text-slate-200">Desde aqui puedes crear, iniciar y ejecutar levantamientos tecnicos.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.total}</p>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-sm font-medium text-amber-700">Pendientes</p>
          <p className="mt-2 text-2xl font-semibold text-amber-800">{stats.pending}</p>
        </article>
        <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <p className="text-sm font-medium text-blue-700">En progreso</p>
          <p className="mt-2 text-2xl font-semibold text-blue-800">{stats.inProgress}</p>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-sm font-medium text-emerald-700">Completados</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-800">{stats.completed}</p>
        </article>
        <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
          <p className="text-sm font-medium text-rose-700">Cancelados</p>
          <p className="mt-2 text-2xl font-semibold text-rose-800">{stats.canceled}</p>
        </article>
      </div>

      <div className="flex items-center justify-end">
        {canCreate ? (
          <Button
            type="button"
            onClick={openCreateModal}
            className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
            icon={<Plus size={16} />}
          >
            Nuevo levantamiento
          </Button>
        ) : null}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Listado de levantamientos</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {surveys.length} registros
          </span>
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-slate-500">Cargando levantamientos...</div>
        ) : error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">Error cargando levantamientos</p>
            <p className="mt-1">{error}</p>
          </div>
        ) : surveys.length === 0 ? (
          <div className="mt-4">
            <EmptyState text="No hay levantamientos registrados." />
          </div>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {surveys.map((survey) => {
              const statusKey = normalizeSurveyStatus(survey.status) ?? "pendiente";
              const visitStatusKey = normalizeVisitStatus(survey.visitStatus);
              const statusClass = STATUS_STYLES[statusKey] ?? "border-slate-200 bg-slate-50 text-slate-700";
              const showProgramVisitCta =
                statusKey === "pendiente" && visitStatusKey === "cancelada";

              return (
                <article
                  key={survey.id}
                  className="rounded-2xl border border-blue-200 bg-linear-to-br from-white via-blue-50 to-cyan-50 p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-100/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        Levantamiento
                      </span>

                      <div>
                      <p className="text-sm font-semibold text-slate-900">{survey.customerName ?? "Cliente sin nombre"}</p>
                      <p className="mt-1 text-xs text-slate-500">{survey.siteName ?? "Sitio sin nombre"}</p>
                      </div>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass}`}>
                      {formatSurveyStatusLabel(survey.status)}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <CalendarClock size={14} className="text-slate-400" />
                      <span>{formatDateTime(survey.scheduledStart)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserRound size={14} className="text-slate-400" />
                      <span>{survey.technicianName ?? "Tecnico no asignado"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ClipboardCheck size={14} className="text-slate-400" />
                      <span>{formatVisitStatusLabel(survey.visitStatus)}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => navigate(`/admin/site_surveys/${survey.id}`)}
                      className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                    >
                      Abrir
                    </Button>

                    {canRescheduleVisit &&
                    survey.visitId &&
                    canRescheduleVisitStatus(survey.visitStatus) &&
                    normalizeSurveyStatus(survey.status) !== "cancelado" ? (
                      <Button
                        type="button"
                        onClick={() => openRescheduleModal(survey)}
                        className={
                          showProgramVisitCta
                            ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        }
                      >
                        {showProgramVisitCta ? "Programar visita" : "Reprogramar visita"}
                      </Button>
                    ) : null}

                    {canCancelVisit && survey.visitId && canCancelVisitStatus(survey.visitStatus) ? (
                      <Button
                        type="button"
                        onClick={() => void handleCancelVisit(survey)}
                        disabled={cancelingSurveyId === survey.id}
                        className="border-rose-300 bg-white text-rose-700 hover:bg-rose-50"
                      >
                        {cancelingSurveyId === survey.id ? "Cancelando..." : "Cancelar visita"}
                      </Button>
                    ) : null}

                    {canCancelSurvey && canCancelSurveyStatus(survey.status) ? (
                      <Button
                        type="button"
                        onClick={() => void handleCancelSiteSurvey(survey)}
                        disabled={cancelingSiteSurveyId === survey.id}
                        className="border-rose-600 bg-rose-600 text-white hover:bg-rose-700"
                      >
                        {cancelingSiteSurveyId === survey.id ? "Cancelando..." : "Cancelar levantamiento"}
                      </Button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Modal
        open={createOpen}
        onClose={closeCreateModal}
        title="Nuevo levantamiento"
        subtitle="Registra cliente, sitio, tecnico y horario de visita."
        footer={
          <>
            <Button
              type="button"
              onClick={closeCreateModal}
              disabled={creating}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="create-survey-form"
              disabled={
                creating ||
                optionsLoading ||
                !formValues.customerId ||
                !formValues.siteId ||
                !formValues.technicianId ||
                !formValues.scheduledStart
              }
              className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
            >
              {creating ? "Creando..." : "Crear levantamiento"}
            </Button>
          </>
        }
      >
        <form id="create-survey-form" onSubmit={handleCreate} className="space-y-3">
          <Field label="Cliente">
            <select
              value={formValues.customerId}
              onChange={(event) => {
                setFormValues((current) => ({ ...current, customerId: event.target.value, siteId: "" }));
              }}
              disabled={optionsLoading}
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
              value={formValues.siteId}
              onChange={(event) => setFormValues((current) => ({ ...current, siteId: event.target.value }))}
              disabled={optionsLoading || !formValues.customerId}
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

          <Field label="Tecnico asignado">
            <select
              value={formValues.technicianId}
              onChange={(event) => setFormValues((current) => ({ ...current, technicianId: event.target.value }))}
              disabled={optionsLoading}
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Selecciona un tecnico</option>
              {technicianOptions.map((technician) => (
                <option key={technician.id} value={technician.id}>
                  {technician.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Inicio">
              <input
                type="datetime-local"
                value={formValues.scheduledStart}
                onChange={(event) => setFormValues((current) => ({ ...current, scheduledStart: event.target.value }))}
                className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </Field>

            <Field label="Fin (opcional)">
              <input
                type="datetime-local"
                value={formValues.scheduledEnd}
                onChange={(event) => setFormValues((current) => ({ ...current, scheduledEnd: event.target.value }))}
                className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </Field>
          </div>
        </form>
      </Modal>

      <Modal
        open={rescheduleOpen}
        onClose={closeRescheduleModal}
        title="Reprogramar visita tecnica"
        subtitle="Actualiza la fecha de inicio y fin de la visita seleccionada."
        footer={(
          <>
            <Button
              type="button"
              onClick={closeRescheduleModal}
              disabled={Boolean(reschedulingSurveyId)}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="reschedule-survey-visit-form"
              disabled={Boolean(reschedulingSurveyId) || !rescheduleStart}
              className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
            >
              {reschedulingSurveyId ? "Guardando..." : "Guardar cambios"}
            </Button>
          </>
        )}
      >
        <form id="reschedule-survey-visit-form" onSubmit={handleRescheduleVisit} className="space-y-3">
          <Field label="Inicio">
            <input
              type="datetime-local"
              value={rescheduleStart}
              onChange={(event) => setRescheduleStart(event.target.value)}
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            />
          </Field>

          <Field label="Fin (opcional)">
            <input
              type="datetime-local"
              value={rescheduleEnd}
              onChange={(event) => setRescheduleEnd(event.target.value)}
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            />
          </Field>
        </form>
      </Modal>
    </section>
  );
}
