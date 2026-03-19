
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, ClipboardCheck, Plus, User } from "lucide-react";
import Button from "../../components/Button";
import Checkbox from "../../components/Checkbox";
import EmptyState from "../../components/EmptyState";
import Field from "../../components/Field";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import { PERMISSIONS } from "../../constants/permissions";
import { useAuth } from "../../hooks/useAuth";
import { listCustomers } from "../../services/customers.service";
import { notifications } from "../../services/notification.service";
import {
  createSiteSurvey,
  listCustomerSites,
  listSiteSurveyChecklistItems,
  listSiteSurveys,
  updateSiteSurvey,
  upsertSiteSurveyChecklistItems,
} from "../../services/siteSurvey.service";
import { listUsers } from "../../services/users.service";
import type { CompanyUser } from "../../types/userManagement.types";
import type { SimpleOption, SiteSurveyChecklistItem, SiteSurveySummary } from "../../types/siteSurvey.types";

const STATUS_STYLES: Record<string, string> = {
  pendiente: "border-amber-200 bg-amber-50 text-amber-700",
  "en progreso": "border-blue-200 bg-blue-50 text-blue-700",
  completado: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function formatDate(value?: string | null): string {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  return new Intl.DateTimeFormat("es-DO", { dateStyle: "medium" }).format(date);
}

function toLocalDateString(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isDateReached(value?: string | null): boolean {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  const visitDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return visitDay <= today;
}

function isCompletedSurvey(survey: SiteSurveySummary): boolean {
  if (survey.completedAt) return true;
  const normalized = (survey.status ?? "").toLowerCase();
  return normalized === "completado";
}

export default function SiteSurvey() {
  const { authUser, companyProfile, canAccess } = useAuth();
  const companyId = companyProfile?.id ?? null;
  const canCreate = canAccess(PERMISSIONS.siteSurveyCreate);

  const [surveys, setSurveys] = useState<SiteSurveySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formValues, setFormValues] = useState({
    customerId: "",
    siteId: "",
    technicianId: "",
    date: "",
  });

  const [customerOptions, setCustomerOptions] = useState<SimpleOption[]>([]);
  const [siteOptions, setSiteOptions] = useState<SimpleOption[]>([]);
  const [technicianOptions, setTechnicianOptions] = useState<SimpleOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const [activeSurvey, setActiveSurvey] = useState<SiteSurveySummary | null>(null);
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [checklistItems, setChecklistItems] = useState<SiteSurveyChecklistItem[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [executionValues, setExecutionValues] = useState({
    requirements: "",
    observations: "",
    recomendations: "",
    risks: "",
  });
  const [savingExecution, setSavingExecution] = useState(false);

  const loadSurveys = useCallback(async () => {
    if (!companyId) {
      setSurveys([]);
      setLoading(false);
      setError("No se encontro la compania del usuario autenticado.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await listSiteSurveys(companyId);
      setSurveys(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error cargando levantamientos.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const loadOptions = useCallback(async () => {
    if (!companyId) return;
    setOptionsLoading(true);

    try {
      const [customersResult, usersResult] = await Promise.all([
        listCustomers(companyId, { page: 1, pageSize: 200 }),
        listUsers(companyId, { page: 1, pageSize: 200 }),
      ]);

      const customers = customersResult.items.map((customer) => ({
        id: customer.id,
        name: customer.name,
      }));

      const technicianMap = new Map<string, SimpleOption>();
      usersResult.items
        .filter((user) => user.roleName?.toLowerCase() !== "customer")
        .forEach((user: CompanyUser) => {
          if (!technicianMap.has(user.id)) {
            technicianMap.set(user.id, { id: user.id, name: user.name });
          }
        });

      setCustomerOptions(customers);
      setTechnicianOptions(Array.from(technicianMap.values()));
    } catch (err) {
      notifications.error({
        title: "Error cargando opciones",
        description: "No se pudieron cargar clientes o tecnicos.",
      });
    } finally {
      setOptionsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadSurveys();
  }, [loadSurveys]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    if (!companyId || !formValues.customerId) {
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
          setFormValues((prev) => ({ ...prev, siteId: "" }));
        } else if (!sites.find((site) => site.id === formValues.siteId)) {
          setFormValues((prev) => ({ ...prev, siteId: sites[0].id }));
        }
      } catch (err) {
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
  }, [companyId, formValues.customerId, formValues.siteId]);

  const stats = useMemo(() => {
    const total = surveys.length;
    const completed = surveys.filter((survey) => isCompletedSurvey(survey)).length;
    const pending = total - completed;
    const today = surveys.filter((survey) => {
      const scheduled = toLocalDateString(survey.scheduledStart);
      const now = toLocalDateString(new Date().toISOString());
      return scheduled && now ? scheduled === now : false;
    }).length;

    return { total, completed, pending, today };
  }, [surveys]);

  const openCreateModal = () => {
    setFormValues({
      customerId: "",
      siteId: "",
      technicianId: "",
      date: "",
    });
    setCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (creating) return;
    setCreateModalOpen(false);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!companyId) return;
    if (!formValues.customerId || !formValues.siteId || !formValues.technicianId || !formValues.date) {
      notifications.warning({
        title: "Campos requeridos",
        description: "Completa cliente, sitio, tecnico y fecha.",
      });
      return;
    }

    const scheduledStart = new Date(`${formValues.date}T09:00:00`).toISOString();

    setCreating(true);
    try {
      await createSiteSurvey(companyId, {
        customerId: formValues.customerId,
        siteId: formValues.siteId,
        technicianId: formValues.technicianId,
        scheduledStart,
      });
      notifications.success({
        title: "Levantamiento creado",
        description: "El levantamiento fue agendado correctamente.",
      });
      setCreateModalOpen(false);
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

  const openStartModal = async (survey: SiteSurveySummary) => {
    setActiveSurvey(survey);
    setExecutionValues({
      requirements: survey.requirements ?? "",
      observations: survey.observations ?? "",
      recomendations: survey.recomendations ?? "",
      risks: survey.risks ?? "",
    });
    setStartModalOpen(true);
    setChecklistLoading(true);
    try {
      const items = await listSiteSurveyChecklistItems(survey.id);
      setChecklistItems(items);
    } catch (err) {
      notifications.error({
        title: "Error cargando checklist",
        description: err instanceof Error ? err.message : "No se pudo cargar el checklist.",
      });
    } finally {
      setChecklistLoading(false);
    }
  };

  const closeStartModal = () => {
    if (savingExecution) return;
    setStartModalOpen(false);
    setActiveSurvey(null);
    setChecklistItems([]);
  };

  const updateChecklistItem = (id: string, patch: Partial<SiteSurveyChecklistItem>) => {
    setChecklistItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const saveExecution = async (markCompleted = false) => {
    if (!activeSurvey) return;
    setSavingExecution(true);
    try {
      await updateSiteSurvey(activeSurvey.id, {
        requirements: executionValues.requirements || null,
        observations: executionValues.observations || null,
        recomendations: executionValues.recomendations || null,
        risks: executionValues.risks || null,
        status: markCompleted ? "Completado" : activeSurvey.status ?? undefined,
        completedAt: markCompleted ? new Date().toISOString() : activeSurvey.completedAt ?? undefined,
      });
      await upsertSiteSurveyChecklistItems(checklistItems);
      notifications.success({
        title: markCompleted ? "Levantamiento completado" : "Levantamiento actualizado",
        description: markCompleted ? "Se marco como completado." : "Cambios guardados correctamente.",
      });
      setStartModalOpen(false);
      setActiveSurvey(null);
      await loadSurveys();
    } catch (err) {
      notifications.error({
        title: "Error guardando levantamiento",
        description: err instanceof Error ? err.message : "No se pudieron guardar los cambios.",
      });
    } finally {
      setSavingExecution(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-linear-to-r from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight">Levantamientos</h1>
        <p className="mt-2 text-sm text-slate-200">
          Agenda y ejecucion de levantamientos tecnicos para {companyProfile?.name ?? "tu compania"}.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Total</p>
            <ClipboardCheck size={16} className="text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.total}</p>
        </article>

        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-amber-700">Pendientes</p>
            <CalendarDays size={16} className="text-amber-700" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-amber-800">{stats.pending}</p>
        </article>

        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-emerald-700">Completados</p>
            <ClipboardCheck size={16} className="text-emerald-700" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-emerald-800">{stats.completed}</p>
        </article>

        <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-blue-700">Hoy</p>
            <CalendarDays size={16} className="text-blue-700" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-blue-800">{stats.today}</p>
        </article>
      </div>

      <div className="flex items-center justify-end">
        {canCreate && (
          <Button
            type="button"
            onClick={openCreateModal}
            disabled={optionsLoading || creating}
            icon={<Plus size={16} />}
            className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
          >
            Nuevo levantamiento
          </Button>
        )}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
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
            <div className="mt-3">
              <Button
                type="button"
                onClick={() => void loadSurveys()}
                className="border-red-300 bg-white text-red-700 hover:bg-red-100"
              >
                Reintentar
              </Button>
            </div>
          </div>
        ) : surveys.length === 0 ? (
          <div className="mt-4">
            <EmptyState text="No hay levantamientos registrados." />
          </div>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {surveys.map((survey) => {
              const isAssigned = Boolean(authUser?.id && survey.technicianId === authUser.id);
              const canStart = isAssigned && isDateReached(survey.scheduledStart) && !isCompletedSurvey(survey);
              const statusKey = (survey.status ?? "Pendiente").toLowerCase();
              const statusClass = STATUS_STYLES[statusKey] ?? "border-slate-200 bg-slate-50 text-slate-700";

              return (
                <article key={survey.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {survey.customerName ?? "Cliente sin nombre"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {survey.siteName ?? "Sitio sin nombre"}
                      </p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass}`}>
                      {survey.status ?? "Pendiente"}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <CalendarDays size={14} className="text-slate-400" />
                      <span>{formatDate(survey.scheduledStart)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-slate-400" />
                      <span>{survey.technicianName ?? "Tecnico no asignado"}</span>
                    </div>
                  </div>

                  {canStart ? (
                    <div className="mt-4">
                      <Button
                        type="button"
                        onClick={() => void openStartModal(survey)}
                        className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                        fullWidth
                      >
                        Empezar levantamiento
                      </Button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Modal
        open={createModalOpen}
        onClose={closeCreateModal}
        title="Nuevo levantamiento"
        subtitle="Selecciona cliente, sitio, tecnico y fecha."
        footer={
          <>
            <Button
              type="button"
              onClick={closeCreateModal}
              disabled={creating}
              className="border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="create-site-survey-form"
              disabled={
                creating ||
                optionsLoading ||
                !formValues.customerId ||
                !formValues.siteId ||
                !formValues.technicianId ||
                !formValues.date
              }
              className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
            >
              Crear levantamiento
            </Button>
          </>
        }
      >
        <form id="create-site-survey-form" onSubmit={handleCreate} className="space-y-3">
          <Field label="Cliente">
            <select
              value={formValues.customerId}
              onChange={(event) => {
                setFormValues((prev) => ({
                  ...prev,
                  customerId: event.target.value,
                  siteId: "",
                }));
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
              onChange={(event) => setFormValues((prev) => ({ ...prev, siteId: event.target.value }))}
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
              onChange={(event) => setFormValues((prev) => ({ ...prev, technicianId: event.target.value }))}
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

          <Field label="Fecha del levantamiento">
            <Input
              type="date"
              value={formValues.date}
              onChange={(event) => setFormValues((prev) => ({ ...prev, date: event.target.value }))}
              disabled={optionsLoading}
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={startModalOpen}
        onClose={closeStartModal}
        title="Ejecutar levantamiento"
        subtitle={activeSurvey ? `${activeSurvey.customerName ?? "Cliente"} - ${activeSurvey.siteName ?? "Sitio"}` : ""}
        size="lg"
        footer={
          <>
            <Button
              type="button"
              onClick={closeStartModal}
              disabled={savingExecution}
              className="border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Cerrar
            </Button>
            <Button
              type="button"
              onClick={() => void saveExecution(false)}
              disabled={savingExecution}
              className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
            >
              Guardar
            </Button>
            <Button
              type="button"
              onClick={() => void saveExecution(true)}
              disabled={savingExecution}
              className="border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Finalizar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Requerimientos">
              <textarea
                value={executionValues.requirements}
                onChange={(event) => setExecutionValues((prev) => ({ ...prev, requirements: event.target.value }))}
                className="min-h-[100px] w-full rounded-xl border-2 border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </Field>
            <Field label="Observaciones">
              <textarea
                value={executionValues.observations}
                onChange={(event) => setExecutionValues((prev) => ({ ...prev, observations: event.target.value }))}
                className="min-h-[100px] w-full rounded-xl border-2 border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </Field>
            <Field label="Recomendaciones">
              <textarea
                value={executionValues.recomendations}
                onChange={(event) => setExecutionValues((prev) => ({ ...prev, recomendations: event.target.value }))}
                className="min-h-[100px] w-full rounded-xl border-2 border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </Field>
            <Field label="Riesgos">
              <textarea
                value={executionValues.risks}
                onChange={(event) => setExecutionValues((prev) => ({ ...prev, risks: event.target.value }))}
                className="min-h-[100px] w-full rounded-xl border-2 border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </Field>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">Checklist</h3>
            {checklistLoading ? (
              <p className="text-sm text-slate-500">Cargando checklist...</p>
            ) : checklistItems.length === 0 ? (
              <EmptyState text="No hay items de checklist para este levantamiento." />
            ) : (
              <div className="space-y-2">
                {checklistItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={item.checked}
                        onChange={(event) => updateChecklistItem(item.id, { checked: event.target.checked })}
                      />
                      <div className="flex-1 space-y-2">
                        <p className="text-sm font-medium text-slate-800">{item.text}</p>
                        <Input
                          value={item.notes ?? ""}
                          onChange={(event) => updateChecklistItem(item.id, { notes: event.target.value })}
                          placeholder="Notas del tecnico (opcional)"
                          className="py-2"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </section>
  );
}
