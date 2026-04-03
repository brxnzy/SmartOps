import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CalendarClock,
  Check,
  ClipboardList,
  Lock,
  Pencil,
  Plus,
  Save,
  Trash2,
  Wrench,
} from "lucide-react";
import Button from "../../components/Button";
import Field from "../../components/Field";
import FloorPlanEditor from "../../components/siteSurvey/FloorPlanEditor";
import { PERMISSIONS } from "../../constants/permissions";
import { useAuth } from "../../hooks/useAuth";
import {
  createInstallationProjectTask,
  getInstallationProjectById,
  seedInstallationProjectDefaults,
  updateInstallationProjectMetadata,
  updateInstallationProjectPostInstallationCheck,
  updateInstallationProjectTask,
  upsertInstallationProjectVisit,
  type InstallationProjectDetail,
  type InstallationProjectPhase,
} from "../../services/installation.service";
import { notifications } from "../../services/notification.service";
import { cancelTechnicalVisit } from "../../services/siteSurveyExecution.service";
import { listTechnicians } from "../../services/tickets.service";
import useDeliveryActGeneration from "../../hooks/useDeliveryActGeneration";
import { DeliveryActView } from "../DeliveryAct";

type TaskDraft = {
  title: string;
  completed: boolean;
};

type PostCheckDraft = {
  checked: boolean;
};

function formatDateTime(value: string | null): string {
  if (!value) return "Sin fecha";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sin fecha";
  return parsed.toLocaleString("es-DO");
}

function toDateTimeLocalValue(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toIsoFromLocal(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) throw new Error("Fecha invalida.");
  return new Date(parsed).toISOString();
}

function statusBadge(status: string | null): string {
  if (status === "terminado") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "cancelado") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "en_progreso") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function visitStatusBadge(status: string | null): string {
  if (status === "completada") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "cancelada") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "en_progreso") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function InstallationProjectDetail() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { companyProfile, authUser, canAccess } = useAuth();

  const companyId = companyProfile?.id ?? null;
  const userId = authUser?.id ?? null;

  const canOpenProject = canAccess(PERMISSIONS.installationProjectsOpen) || canAccess(PERMISSIONS.installationProjectsRead);
  const canUpdateProject = canAccess(PERMISSIONS.installationProjectsUpdate);
  const canScheduleVisit = canAccess(PERMISSIONS.installationProjectsVisitSchedule);
  const canCancelVisit = canAccess(PERMISSIONS.installationProjectsVisitCancel);
  const canReadTasks = canAccess(PERMISSIONS.installationProjectsTasksRead);
  const canUpdateTasks = canAccess(PERMISSIONS.installationProjectsTasksUpdate);
  const canReadPostChecks = canAccess(PERMISSIONS.installationProjectsQualityRead);
  const canUpdatePostChecks = canAccess(PERMISSIONS.installationProjectsQualityUpdate);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<InstallationProjectDetail | null>(null);
  const [technicians, setTechnicians] = useState<Array<{ id: string; name: string }>>([]);

  const [scopeText, setScopeText] = useState("");
  const [phasesDraft, setPhasesDraft] = useState<InstallationProjectPhase[]>([]);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [newPhaseTitle, setNewPhaseTitle] = useState("");
  const [newPhaseDescription, setNewPhaseDescription] = useState("");
  const [savingPlan, setSavingPlan] = useState(false);

  const [visitTechnicianId, setVisitTechnicianId] = useState("");
  const [visitStart, setVisitStart] = useState("");
  const [schedulingVisit, setSchedulingVisit] = useState(false);
  const [cancelingVisit, setCancelingVisit] = useState(false);

  const [taskDrafts, setTaskDrafts] = useState<Record<string, TaskDraft>>({});
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);
  const [savingTasks, setSavingTasks] = useState(false);
  const [tasksDirty, setTasksDirty] = useState(false);

  const [postCheckDrafts, setPostCheckDrafts] = useState<Record<string, PostCheckDraft>>({});
  const [savingPostChecks, setSavingPostChecks] = useState(false);
  const [postChecksDirty, setPostChecksDirty] = useState(false);

  const deliveryAct = useDeliveryActGeneration(projectId ?? null);

  const loadProject = useCallback(async () => {
    if (!companyId || !projectId) {
      setLoading(false);
      setError("No se encontro el proyecto solicitado.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await seedInstallationProjectDefaults({ companyId, projectId });

      const [projectData, technicianRows] = await Promise.all([
        getInstallationProjectById(projectId, companyId),
        listTechnicians(companyId),
      ]);

      const dedupedTechnicians = Array.from(new Map(technicianRows.map((tech) => [tech.id, tech])).values());

      setProject(projectData);
      setTechnicians(dedupedTechnicians);
      setScopeText(projectData.scope ?? "");
      setPhasesDraft(projectData.phases);

      setVisitTechnicianId(projectData.technicianId ?? dedupedTechnicians[0]?.id ?? "");
      setVisitStart(toDateTimeLocalValue(projectData.scheduledStart));

      const nextTaskDrafts: Record<string, TaskDraft> = {};
      projectData.tasks.forEach((task) => {
        nextTaskDrafts[task.id] = {
          title: task.title,
          completed: task.status === "completada",
        };
      });
      setTaskDrafts(nextTaskDrafts);
      setTasksDirty(false);

      const nextPostDrafts: Record<string, PostCheckDraft> = {};
      projectData.postInstallationChecks.forEach((item) => {
        nextPostDrafts[item.id] = { checked: item.checked };
      });
      setPostCheckDrafts(nextPostDrafts);
      setPostChecksDirty(false);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el proyecto.");
    } finally {
      setLoading(false);
    }
  }, [companyId, projectId]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  const layoutZones = useMemo(() => {
    if (!project) return [];
    return project.layout.zones.map((zone) => ({
      id: zone.id,
      customerSiteId: project.siteId,
      companyId: project.companyId,
      name: zone.name,
    }));
  }, [project]);

  const layoutDevicesCatalog = useMemo(() => {
    if (!project) return [];
    return Array.from(
      new Map(
        project.budgetItems.map((item) => [
          item.deviceId,
          {
            id: item.deviceId,
            name: item.deviceName ?? "Dispositivo",
            model: item.deviceModel ?? "",
            label: item.deviceModel ? `${item.deviceName ?? "Dispositivo"} (${item.deviceModel})` : item.deviceName ?? "Dispositivo",
          },
        ])
      ).values()
    );
  }, [project]);

  const pendingPhases = useMemo(() => phasesDraft.filter((phase) => !phase.done).length, [phasesDraft]);

  const pendingPostChecks = useMemo(() => {
    if (!project) return 0;
    return project.postInstallationChecks.filter((item) => {
      const draft = postCheckDrafts[item.id];
      return !(draft?.checked ?? item.checked);
    }).length;
  }, [postCheckDrafts, project]);

  const isClosed = project?.status === "terminado" || project?.status === "cancelado";
  const isPlanLocked = Boolean(project?.planLocked) || Boolean(isClosed);

  const handleAddPhase = () => {
    const title = newPhaseTitle.trim();
    if (!title) {
      notifications.warning({
        title: "Fase requerida",
        description: "Debes escribir el nombre de la fase.",
      });
      return;
    }

    setPhasesDraft((current) => [
      ...current,
      {
        id: typeof crypto !== "undefined" ? crypto.randomUUID() : `phase-${Date.now()}`,
        title,
        description: newPhaseDescription.trim() || null,
        done: false,
        completedAt: null,
      },
    ]);

    setNewPhaseTitle("");
    setNewPhaseDescription("");
  };

  const handlePhaseChange = (phaseId: string, patch: Partial<InstallationProjectPhase>) => {
    setPhasesDraft((current) =>
      current.map((phase) => {
        if (phase.id !== phaseId) return phase;
        const next = { ...phase, ...patch };
        if (patch.done !== undefined) {
          next.completedAt = patch.done ? phase.completedAt ?? new Date().toISOString() : null;
        }
        return next;
      })
    );
  };

  const handleRemovePhase = (phaseId: string) => {
    setPhasesDraft((current) => current.filter((phase) => phase.id !== phaseId));
  };

  const handleSavePlan = async () => {
    if (!companyId || !project || !canUpdateProject) return;

    const cleanPhases = phasesDraft
      .map((phase) => ({
        ...phase,
        title: phase.title.trim(),
        description: phase.description?.trim() || null,
      }))
      .filter((phase) => phase.title.length > 0);

    if (cleanPhases.length === 0) {
      notifications.warning({
        title: "Fases requeridas",
        description: "Debes agregar al menos una fase para el proyecto.",
      });
      return;
    }

    const lockPlan = cleanPhases.every((phase) => phase.done);

    setSavingPlan(true);
    try {
      await updateInstallationProjectMetadata({
        companyId,
        projectId: project.id,
        scope: scopeText.trim() || null,
        phases: cleanPhases,
        lockPlan,
      });

      notifications.success({
        title: lockPlan ? "Plan guardado y bloqueado" : "Plan actualizado",
        description: lockPlan
          ? "Todas las fases estan completas. El plan queda en solo lectura."
          : "Se guardaron descripcion y fases del proyecto.",
      });
      setEditingPhaseId(null);
      await loadProject();
    } catch (saveError) {
      notifications.error({
        title: "Error guardando plan",
        description: saveError instanceof Error ? saveError.message : "No se pudo guardar el plan.",
      });
    } finally {
      setSavingPlan(false);
    }
  };

  const handleScheduleVisit = async () => {
    if (!companyId || !project || !canScheduleVisit) return;

    if (!visitTechnicianId) {
      notifications.warning({
        title: "Tecnico requerido",
        description: "Selecciona el tecnico encargado.",
      });
      return;
    }

    if (!visitStart) {
      notifications.warning({
        title: "Fecha requerida",
        description: "Selecciona la fecha/hora de inicio.",
      });
      return;
    }

    let scheduledStartIso: string;
    try {
      scheduledStartIso = toIsoFromLocal(visitStart);
    } catch {
      notifications.warning({
        title: "Fecha invalida",
        description: "Verifica la fecha/hora de inicio.",
      });
      return;
    }

    setSchedulingVisit(true);
    try {
      const result = await upsertInstallationProjectVisit({
        companyId,
        projectId: project.id,
        technicianId: visitTechnicianId,
        scheduledStart: scheduledStartIso,
        scheduledEnd: null,
      });

      notifications.success({
        title: result.created ? "Visita programada" : "Visita reprogramada",
        description: "Se guardo la fecha de inicio de la visita tecnica.",
      });
      await loadProject();
    } catch (scheduleError) {
      notifications.error({
        title: "Error guardando visita",
        description: scheduleError instanceof Error ? scheduleError.message : "No se pudo programar la visita.",
      });
    } finally {
      setSchedulingVisit(false);
    }
  };

  const handleCancelVisit = async () => {
    if (!project?.technicalVisitId || !canCancelVisit) return;
    if (project.technicalVisitStatus === "completada" || project.technicalVisitStatus === "cancelada") {
      notifications.warning({
        title: "Accion no permitida",
        description: "La visita no se puede cancelar por su estado actual.",
      });
      return;
    }

    const confirmed = window.confirm("Se cancelara solo la visita tecnica del proyecto. Deseas continuar?");
    if (!confirmed) return;

    setCancelingVisit(true);
    try {
      await cancelTechnicalVisit(project.technicalVisitId);
      notifications.success({
        title: "Visita cancelada",
        description: "La visita tecnica del proyecto fue cancelada.",
      });
      await loadProject();
    } catch (cancelError) {
      notifications.error({
        title: "Error cancelando visita",
        description: cancelError instanceof Error ? cancelError.message : "No se pudo cancelar la visita.",
      });
    } finally {
      setCancelingVisit(false);
    }
  };

  const handleTaskChange = (taskId: string, patch: Partial<TaskDraft>) => {
    setTaskDrafts((current) => ({
      ...current,
      [taskId]: {
        title: current[taskId]?.title ?? "",
        completed: current[taskId]?.completed ?? false,
        ...patch,
      },
    }));
    setTasksDirty(true);
  };

  const handleCreateTask = async () => {
    if (!companyId || !project || !canUpdateTasks) return;

    const title = newTaskTitle.trim();
    if (!title) {
      notifications.warning({
        title: "Tarea requerida",
        description: "Escribe el nombre de la tarea.",
      });
      return;
    }

    setCreatingTask(true);
    try {
      await createInstallationProjectTask({
        companyId,
        projectId: project.id,
        title,
      });
      setNewTaskTitle("");
      notifications.success({
        title: "Tarea creada",
        description: "La tarea fue agregada al proyecto.",
      });
      await loadProject();
    } catch (createError) {
      notifications.error({
        title: "Error creando tarea",
        description: createError instanceof Error ? createError.message : "No se pudo crear la tarea.",
      });
    } finally {
      setCreatingTask(false);
    }
  };

  const handleSaveTasks = useCallback(async () => {
    if (!companyId || !project || !canUpdateTasks) return;

    const payload = project.tasks.map((task) => {
      const draft = taskDrafts[task.id] ?? { title: task.title, completed: task.status === "completada" };
      return {
        taskId: task.id,
        title: draft.title.trim(),
        completed: draft.completed,
      };
    });

    const emptyTask = payload.find((row) => row.title.length === 0);
    if (emptyTask) {
      notifications.warning({
        title: "Tarea invalida",
        description: "Ninguna tarea puede quedar sin titulo.",
      });
      return;
    }

    setSavingTasks(true);
    try {
      await Promise.all(
        payload.map((row) =>
          updateInstallationProjectTask({
            companyId,
            taskId: row.taskId,
            patch: {
              title: row.title,
              status: row.completed ? "completada" : "pendiente",
              assignedTechnicianId: null,
              dueAt: null,
            },
          })
        )
      );

      notifications.success({
        title: "Tareas actualizadas",
        description: "Se guardaron los cambios de tareas del proyecto.",
      });
      setTasksDirty(false);
    } catch (saveError) {
      notifications.error({
        title: "Error guardando tareas",
        description: saveError instanceof Error ? saveError.message : "No se pudieron guardar las tareas.",
      });
    } finally {
      setSavingTasks(false);
    }
  }, [canUpdateTasks, companyId, project, taskDrafts]);

  const handlePostCheckChange = (itemId: string, checked: boolean) => {
    setPostCheckDrafts((current) => ({
      ...current,
      [itemId]: { checked },
    }));
    setPostChecksDirty(true);
  };

  const handleSavePostChecks = useCallback(async () => {
    if (!companyId || !userId || !project || !canUpdatePostChecks) return;

    const changed = project.postInstallationChecks.filter((item) => {
      const draft = postCheckDrafts[item.id];
      return draft && draft.checked !== item.checked;
    });

    if (changed.length === 0) {
      notifications.info({
        title: "Sin cambios",
        description: "No hay cambios pendientes en pruebas post instalacion.",
      });
      return;
    }

    setSavingPostChecks(true);
    try {
      await Promise.all(
        changed.map((item) => {
          const draft = postCheckDrafts[item.id];
          return updateInstallationProjectPostInstallationCheck({
            companyId,
            projectId: project.id,
            itemId: item.id,
            checked: Boolean(draft?.checked),
            notes: null,
            userId,
          });
        })
      );

      notifications.success({
        title: "Pruebas actualizadas",
        description: "Se guardaron los cambios de pruebas post instalacion.",
      });
      setPostChecksDirty(false);
    } catch (saveError) {
      notifications.error({
        title: "Error guardando pruebas",
        description: saveError instanceof Error ? saveError.message : "No se pudieron guardar las pruebas.",
      });
    } finally {
      setSavingPostChecks(false);
    }
  }, [canUpdatePostChecks, companyId, postCheckDrafts, project, userId]);

  useEffect(() => {
    if (!tasksDirty || savingTasks || !project || !canUpdateTasks || isClosed) return;
    const timer = window.setTimeout(() => {
      void handleSaveTasks();
    }, 550);
    return () => window.clearTimeout(timer);
  }, [canUpdateTasks, handleSaveTasks, isClosed, project, savingTasks, taskDrafts, tasksDirty]);

  useEffect(() => {
    if (!postChecksDirty || savingPostChecks || !project || !canUpdatePostChecks || isClosed) return;
    const timer = window.setTimeout(() => {
      void handleSavePostChecks();
    }, 450);
    return () => window.clearTimeout(timer);
  }, [canUpdatePostChecks, handleSavePostChecks, isClosed, postCheckDrafts, postChecksDirty, project, savingPostChecks]);

  if (!projectId) {
    return <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">No se encontro el proyecto solicitado.</section>;
  }

  if (!canOpenProject) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700">
        No tienes permisos para abrir proyectos de instalacion.
      </section>
    );
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
        Cargando proyecto de instalacion...
      </section>
    );
  }

  if (error || !project) {
    return (
      <section className="space-y-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error ?? "No se pudo cargar el proyecto de instalacion."}</div>
        <Button type="button" onClick={() => navigate("/admin/installation-projects")} className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100">
          Volver a proyectos
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-linear-to-r from-slate-900 via-slate-800 to-teal-900 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Button type="button" onClick={() => navigate(`/admin/budgets/${project.budgetId}`)} className="border-white/20 bg-white text-slate-900 hover:bg-slate-100">
              Volver al presupuesto
            </Button>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Proyecto de instalacion</h1>
            <p className="mt-2 text-sm text-slate-200">{project.customerName ?? "Cliente"} · {project.siteName ?? "Sitio"}</p>
            <p className="mt-1 text-xs text-slate-300">Proyecto #{project.id.slice(0, 8)}</p>
          </div>
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge(project.status)}`}>
            {project.status}
          </span>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">Plano final (solo lectura)</h2>
          </div>
          <div className="mt-4">
            <div className="mx-auto w-[92%]">
              <FloorPlanEditor
                surveyId={project.surveyId ?? project.id}
                layout={project.layout}
                zonesCatalog={layoutZones}
                devicesCatalog={layoutDevicesCatalog}
                onLayoutChange={() => undefined}
                onManualSave={() => undefined}
                manualSaving={false}
                autosaveLabel=""
                showSave={false}
                restrictToDevices
                locked
                presentationOnly
              />
            </div>
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Acta de entrega</h2>
            <p className="mt-2 text-sm text-slate-600">
              Genera el documento para que el cliente lo firme o acepte.
            </p>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p>
                <span className="font-medium text-slate-700">Estado:</span>{" "}
                {deliveryAct.act?.status === "signed"
                  ? "Firmada"
                  : deliveryAct.act?.status === "accepted"
                  ? "Aceptada"
                  : deliveryAct.act
                  ? "Pendiente"
                  : "Sin generar"}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {deliveryAct.act ? (
                <Button
                  type="button"
                  onClick={() => navigate(`/admin/acta/${deliveryAct.act?.id}?returnTo=/admin/installation-projects/${projectId}`)}
                  className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                >
                  Ver acta
                </Button>
              ) : null}
              {!deliveryAct.act ? (
                <Button
                  type="button"
                  onClick={() => void deliveryAct.generate().then((result) => {
                    if (result?.actId) {
                      navigate(`/admin/acta/${result.actId}?returnTo=/admin/installation-projects/${projectId}`);
                    }
                  })}
                  disabled={deliveryAct.creating}
                  className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                >
                  {deliveryAct.creating ? "Generando..." : "Generar acta"}
                </Button>
              ) : null}
            </div>
          </article>

          <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Visita tecnica</h2>
            <div className="space-y-2 text-sm text-slate-600">
              <p>
                <span className="font-medium text-slate-700">Estado:</span>{" "}
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${visitStatusBadge(project.technicalVisitStatus)}`}>
                  {project.technicalVisitStatus ?? "sin_visita"}
                </span>
              </p>
              <p><span className="font-medium text-slate-700">Inicio:</span> {formatDateTime(project.scheduledStart)}</p>
              <p><span className="font-medium text-slate-700">Tecnico:</span> {project.technicianName ?? "Sin asignar"}</p>
            </div>

            <div className="grid gap-3">
              <Field label="Tecnico encargado">
                <select
                  value={visitTechnicianId}
                  onChange={(event) => setVisitTechnicianId(event.target.value)}
                  disabled={!canScheduleVisit || isClosed}
                  className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Selecciona un tecnico</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>{tech.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Inicio">
                <input
                  type="datetime-local"
                  value={visitStart}
                  onChange={(event) => setVisitStart(event.target.value)}
                  disabled={!canScheduleVisit || isClosed}
                  className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                />
              </Field>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void handleScheduleVisit()}
                disabled={!canScheduleVisit || isClosed || schedulingVisit}
                className="border-teal-600 bg-teal-600 text-white hover:bg-teal-700"
              >
                <CalendarClock className="h-4 w-4" />
                {schedulingVisit ? "Guardando..." : project.technicalVisitId ? "Reprogramar visita" : "Programar visita"}
              </Button>
              {project.technicalVisitId ? (
                <Button
                  type="button"
                  onClick={() => void handleCancelVisit()}
                  disabled={!canCancelVisit || isClosed || cancelingVisit || project.technicalVisitStatus === "cancelada" || project.technicalVisitStatus === "completada"}
                  className="border-rose-300 bg-white text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4 text-rose-600" />
                  {cancelingVisit ? "Cancelando..." : "Cancelar visita"}
                </Button>
              ) : null}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Resumen operativo</h3>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p><span className="font-medium text-slate-700">Fases pendientes:</span> {pendingPhases}</p>
              <p><span className="font-medium text-slate-700">Pruebas pendientes:</span> {pendingPostChecks}</p>
              <p><span className="font-medium text-slate-700">Consumo inventario:</span> {project.consumptions.length}</p>
              <p><span className="font-medium text-slate-700">Finalizado:</span> {formatDateTime(project.completedAt)}</p>
            </div>
            <div className="mt-4">
              {deliveryAct.act ? (
                deliveryAct.act.status === "signed" || deliveryAct.act.status === "accepted" ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    El proyecto se finaliza automaticamente al firmar el acta.
                  </div>
                ) : (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                    Esperando firma/aceptacion del acta para finalizar el proyecto.
                  </div>
                )
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Genera el acta de entrega para completar el proyecto.
                </div>
              )}
            </div>
          </article>
        </aside>
      </section>

      <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">Plan del proyecto</h2>
          {isPlanLocked ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
              <Lock className="h-3.5 w-3.5" />
              Solo lectura
            </span>
          ) : null}
        </div>

        <Field label="Descripcion general">
          <textarea
            value={scopeText}
            onChange={(event) => setScopeText(event.target.value)}
            disabled={!canUpdateProject || isPlanLocked}
            className="min-h-88px w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            placeholder="Describe el plan general del proyecto..."
          />
        </Field>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="grid gap-2 lg:grid-cols-[1fr_1fr_auto]">
            <input
              type="text"
              value={newPhaseTitle}
              onChange={(event) => setNewPhaseTitle(event.target.value)}
              disabled={!canUpdateProject || isPlanLocked}
              placeholder="Nueva fase (ej. Revision)"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
            />
            <input
              type="text"
              value={newPhaseDescription}
              onChange={(event) => setNewPhaseDescription(event.target.value)}
              disabled={!canUpdateProject || isPlanLocked}
              placeholder="Descripcion"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
            />
            <Button
              type="button"
              onClick={handleAddPhase}
              disabled={!canUpdateProject || isPlanLocked || !newPhaseTitle.trim()}
              className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          </div>
        </div>

        {phasesDraft.length === 0 ? (
          <p className="text-sm text-slate-500">No hay fases definidas.</p>
        ) : (
          <div className="space-y-2">
            {phasesDraft.map((phase) => (
              <div key={phase.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                {editingPhaseId === phase.id && canUpdateProject && !isPlanLocked ? (
                  <div className="grid gap-2 lg:grid-cols-[auto_1fr_1fr_auto_auto] lg:items-center">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={phase.done}
                        onChange={(event) => handlePhaseChange(phase.id, { done: event.target.checked })}
                        disabled={!canUpdateProject || isPlanLocked}
                      />
                      Hecha
                    </label>
                    <input
                      type="text"
                      value={phase.title}
                      onChange={(event) => handlePhaseChange(phase.id, { title: event.target.value })}
                      disabled={!canUpdateProject || isPlanLocked}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700"
                    />
                    <input
                      type="text"
                      value={phase.description ?? ""}
                      onChange={(event) => handlePhaseChange(phase.id, { description: event.target.value })}
                      disabled={!canUpdateProject || isPlanLocked}
                      placeholder="Descripcion"
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => setEditingPhaseId(null)}
                      className="inline-flex items-center justify-center rounded-lg border border-emerald-300 bg-white px-2 py-2 text-emerald-700 hover:bg-emerald-50"
                      aria-label="Confirmar edicion"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemovePhase(phase.id)}
                      disabled={!canUpdateProject || isPlanLocked}
                      className="inline-flex items-center justify-center rounded-lg border border-rose-300 bg-white px-2 py-2 text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Eliminar fase"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-2 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={phase.done}
                        onChange={(event) => handlePhaseChange(phase.id, { done: event.target.checked })}
                        disabled={!canUpdateProject || isPlanLocked}
                      />
                    </label>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">{phase.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{phase.description?.trim() || "Sin descripcion"}</p>
                      {phase.done ? <p className="mt-1 text-xs text-emerald-700">Completada</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingPhaseId(phase.id)}
                        disabled={!canUpdateProject || isPlanLocked}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-2 py-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Editar fase"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePhase(phase.id)}
                        disabled={!canUpdateProject || isPlanLocked}
                        className="inline-flex items-center justify-center rounded-lg border border-rose-300 bg-white px-2 py-2 text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Eliminar fase"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => void handleSavePlan()}
            disabled={!canUpdateProject || isPlanLocked || savingPlan}
            className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
          >
            <Save className="h-4 w-4" />
            {savingPlan ? "Guardando..." : "Guardar plan"}
          </Button>
        </div>
      </article>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 text-base font-semibold text-slate-900">
              <ClipboardList className="h-4 w-4" />
              Tareas del proyecto
            </h2>
            <span className="text-xs font-medium text-slate-500">{project.tasks.length} tareas</span>
          </div>

          {!canReadTasks ? (
            <p className="mt-3 text-sm text-slate-500">No tienes permisos para ver tareas del proyecto.</p>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(event) => setNewTaskTitle(event.target.value)}
                  disabled={!canUpdateTasks || isClosed}
                  placeholder="Nueva tarea"
                  className="min-w-220px flex-1 rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                />
                <Button
                  type="button"
                  onClick={() => void handleCreateTask()}
                  disabled={!canUpdateTasks || isClosed || creatingTask || !newTaskTitle.trim()}
                  className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  {creatingTask ? "Agregando..." : "Agregar"}
                </Button>
              </div>

              {project.tasks.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No hay tareas cargadas.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {project.tasks.map((task) => {
                    const draft = taskDrafts[task.id] ?? { title: task.title, completed: task.status === "completada" };
                    return (
                      <label key={task.id} className="grid cursor-pointer gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[auto_1fr] lg:items-center">
                        <input
                          type="checkbox"
                          checked={draft.completed}
                          onChange={(event) => handleTaskChange(task.id, { completed: event.target.checked })}
                          disabled={!canUpdateTasks || isClosed}
                        />
                        <input
                          type="text"
                          value={draft.title}
                          onChange={(event) => handleTaskChange(task.id, { title: event.target.value })}
                          disabled={!canUpdateTasks || isClosed}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700"
                        />
                      </label>
                    );
                  })}
                </div>
              )}

              {savingTasks ? <p className="mt-3 text-xs text-slate-500">Sincronizando tareas...</p> : null}
            </>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 text-base font-semibold text-slate-900">
              <Wrench className="h-4 w-4" />
              Pruebas post instalacion
            </h2>
            <span className="text-xs font-medium text-slate-500">Pendientes: {pendingPostChecks}</span>
          </div>

          {!canReadPostChecks ? (
            <p className="mt-3 text-sm text-slate-500">No tienes permisos para ver las pruebas post instalacion.</p>
          ) : project.postInstallationChecks.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No hay items configurados en pruebas post instalacion.</p>
          ) : (
            <>
              <div className="mt-4 space-y-2">
                {project.postInstallationChecks.map((item) => {
                  const draft = postCheckDrafts[item.id] ?? { checked: item.checked };
                  return (
                    <label key={item.id} className="grid cursor-pointer gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[auto_1fr] lg:items-center">
                      <input
                        type="checkbox"
                        checked={draft.checked}
                        onChange={(event) => handlePostCheckChange(item.id, event.target.checked)}
                        disabled={!canUpdatePostChecks || isClosed}
                      />
                      <span className="text-sm text-slate-800">{item.text}</span>
                    </label>
                  );
                })}
              </div>

              {savingPostChecks ? <p className="mt-3 text-xs text-slate-500">Sincronizando pruebas...</p> : null}
            </>
          )}
        </article>
      </section>

      {project.consumptions.length > 0 ? (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Consumo aplicado</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {project.consumptions.map((consumption) => (
              <div key={consumption.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <p className="font-medium text-slate-700">{consumption.deviceName ?? "Dispositivo"} x {consumption.quantity}</p>
                <p>{formatDateTime(consumption.consumedAt)}</p>
              </div>
            ))}
          </div>
        </article>
      ) : null}
    </section>
  );
}
