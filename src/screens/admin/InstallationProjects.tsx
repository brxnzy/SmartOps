import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import { useAuth } from "../../hooks/useAuth";
import {
  listInstallationProjects,
  type InstallationProjectSummary,
} from "../../services/installation.service";

function formatDate(value: string | null): string {
  if (!value) return "Sin fecha";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "Sin fecha";
  return new Date(parsed).toLocaleString("es-DO");
}

function projectStatusClass(status: string | null): string {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "terminado") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "cancelado") return "border-rose-200 bg-rose-50 text-rose-700";
  if (normalized === "en_progreso") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function InstallationProjects() {
  const navigate = useNavigate();
  const { companyProfile } = useAuth();
  const companyId = companyProfile?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<InstallationProjectSummary[]>([]);

  const loadProjects = useCallback(async () => {
    if (!companyId) {
      setProjects([]);
      setLoading(false);
      setError("No se encontro la compania activa.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const rows = await listInstallationProjects(companyId);
      setProjects(rows);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudieron cargar los proyectos.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-900 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Proyectos de instalacion</h1>
            <p className="mt-2 text-sm text-slate-200">
              Visualiza y abre todos los proyectos creados desde ordenes de trabajo.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => void loadProjects()}
            disabled={loading}
            className="border-white/20 bg-white text-slate-900 hover:bg-slate-100"
          >
            Recargar
          </Button>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Listado</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {projects.length} registros
          </span>
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-slate-500">Cargando proyectos...</div>
        ) : error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : projects.length === 0 ? (
          <div className="mt-4">
            <EmptyState text="Aun no hay proyectos de instalacion." />
          </div>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {projects.map((project) => (
              <article
                key={project.id}
                className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-teal-50 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {project.customerName ?? "Cliente"} - {project.siteName ?? "Sitio"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Presupuesto: {project.budgetStatus ?? "-"}</p>
                    <p className="mt-1 text-xs text-slate-500">Visita: {project.technicalVisitStatus ?? "sin_visita"}</p>
                    <p className="mt-1 text-xs text-slate-500">Inicio: {formatDate(project.scheduledStart)}</p>
                    <p className="mt-1 text-xs text-slate-500">Tecnico: {project.technicianName ?? "Sin asignar"}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${projectStatusClass(project.status)}`}>
                    {project.status}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    onClick={() => navigate(`/admin/installation-projects/${project.id}`)}
                    className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  >
                    Abrir
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
