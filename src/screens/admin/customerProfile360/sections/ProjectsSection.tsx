import EmptyState from "../../../../components/EmptyState";
import type { CustomerProjectSummary } from "../../../../types/customerProfile360.types";

interface ProjectsSectionProps {
  projects: CustomerProjectSummary[];
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("es-DO");
}

export default function ProjectsSection({ projects }: ProjectsSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Proyectos de instalacion</h2>
      {projects.length === 0 ? (
        <div className="mt-4">
          <EmptyState text="No hay proyectos de instalacion para este cliente." />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2">Estado proyecto</th>
                <th className="px-3 py-2">Visita</th>
                <th className="px-3 py-2">Sitio</th>
                <th className="px-3 py-2">Tecnico</th>
                <th className="px-3 py-2">Inicio</th>
                <th className="px-3 py-2">Fin</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-3 py-3">{project.status}</td>
                  <td className="px-3 py-3">{project.visitStatus ?? "sin_visita"}</td>
                  <td className="px-3 py-3">{project.siteName ?? "-"}</td>
                  <td className="px-3 py-3">{project.technicianName ?? "-"}</td>
                  <td className="px-3 py-3">{formatDateTime(project.scheduledStart)}</td>
                  <td className="px-3 py-3">{formatDateTime(project.scheduledEnd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
