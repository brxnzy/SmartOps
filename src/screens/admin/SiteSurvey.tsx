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
import { startSurveyVisit } from "../../services/siteSurveyExecution.service";
import { listUsers } from "../../services/users.service";
import SurveyExecutionPage from "../../components/siteSurvey/SurveyExecutionPage";
import type { SiteSurveySummary, SimpleOption } from "../../types/siteSurvey.types";

const STATUS_STYLES: Record<string, string> = {
  pendiente: "border-amber-200 bg-amber-50 text-amber-700",
  "en progreso": "border-blue-200 bg-blue-50 text-blue-700",
  completado: "border-emerald-200 bg-emerald-50 text-emerald-700",
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
  const normalized = (survey.status ?? "").trim().toLowerCase();
  return normalized === "completado" || Boolean(survey.completedAt);
}

function canStartSurvey(survey: SiteSurveySummary, userId: string | null): boolean {
  if (!userId) return false;
  if (survey.technicianId !== userId) return false;
  if (isCompleted(survey)) return false;
  if (!survey.scheduledStart) return false;
  return Date.now() >= new Date(survey.scheduledStart).getTime();
}

export default function SiteSurvey() {
  const navigate = useNavigate();
  const { surveyId } = useParams();
  const { authUser, companyProfile, canAccess } = useAuth();

  const companyId = companyProfile?.id ?? null;
  const userId = authUser?.id ?? null;
  const canCreate = canAccess(PERMISSIONS.siteSurveyCreate);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [surveys, setSurveys] = useState<SiteSurveySummary[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [customerOptions, setCustomerOptions] = useState<SimpleOption[]>([]);
  const [siteOptions, setSiteOptions] = useState<SimpleOption[]>([]);
  const [technicianOptions, setTechnicianOptions] = useState<SimpleOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const [startingSurveyId, setStartingSurveyId] = useState<string | null>(null);

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
    const inProgress = surveys.filter((survey) => (survey.status ?? "").trim().toLowerCase() === "en progreso").length;
    const pending = total - completed - inProgress;
    return { total, pending, inProgress, completed };
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

  const closeCreateModal = () => {
    if (creating) return;
    setCreateOpen(false);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!companyId) return;

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

  const handleStartSurvey = async (survey: SiteSurveySummary) => {
    if (!survey.visitId) {
      navigate(`/admin/site_surveys/${survey.id}`);
      return;
    }

    setStartingSurveyId(survey.id);
    try {
      await startSurveyVisit(survey.visitId, survey.id);
      notifications.success({
        title: "Levantamiento iniciado",
        description: "Se actualizo el estado a En Progreso.",
      });
      navigate(`/admin/site_surveys/${survey.id}`);
    } catch (err) {
      notifications.error({
        title: "Error iniciando levantamiento",
        description: err instanceof Error ? err.message : "No se pudo iniciar el levantamiento.",
      });
    } finally {
      setStartingSurveyId(null);
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
              const canStart = canStartSurvey(survey, userId);
              const statusKey = (survey.status ?? "Pendiente").trim().toLowerCase();
              const statusClass = STATUS_STYLES[statusKey] ?? "border-slate-200 bg-slate-50 text-slate-700";

              return (
                <article key={survey.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{survey.customerName ?? "Cliente sin nombre"}</p>
                      <p className="mt-1 text-xs text-slate-500">{survey.siteName ?? "Sitio sin nombre"}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass}`}>
                      {survey.status ?? "Pendiente"}
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
                      <span>{survey.visitStatus ?? "Sin estado de visita"}</span>
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

                    {canStart ? (
                      <Button
                        type="button"
                        onClick={() => void handleStartSurvey(survey)}
                        disabled={startingSurveyId === survey.id}
                        className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                      >
                        {startingSurveyId === survey.id ? "Iniciando..." : "Iniciar levantamiento"}
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
    </section>
  );
}
