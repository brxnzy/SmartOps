import EmptyState from "../../../../components/EmptyState";
import type { CustomerSurveySummary } from "../../../../types/customerProfile360.types";

interface SurveysSectionProps {
  surveys: CustomerSurveySummary[];
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("es-DO");
}

export default function SurveysSection({ surveys }: SurveysSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Levantamientos del cliente</h2>
      {surveys.length === 0 ? (
        <div className="mt-4">
          <EmptyState text="No hay levantamientos registrados para este cliente." />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Visita</th>
                <th className="px-3 py-2">Sitio</th>
                <th className="px-3 py-2">Tecnico</th>
                <th className="px-3 py-2">Inicio</th>
                <th className="px-3 py-2">Completado</th>
              </tr>
            </thead>
            <tbody>
              {surveys.map((survey) => (
                <tr key={survey.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-3 py-3">{survey.status}</td>
                  <td className="px-3 py-3">{survey.visitStatus ?? "sin_visita"}</td>
                  <td className="px-3 py-3">{survey.siteName ?? "-"}</td>
                  <td className="px-3 py-3">{survey.technicianName ?? "-"}</td>
                  <td className="px-3 py-3">{formatDateTime(survey.scheduledStart)}</td>
                  <td className="px-3 py-3">{formatDateTime(survey.completedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
