import { useEffect, useState } from "react";
import EmptyState from "../../components/EmptyState";
import { useAuth } from "../../hooks/useAuth";
import { listTicketVisits } from "../../services/tickets.service";
import type { TicketVisit } from "../../types/ticketing.types";

function formatDateTime(value: string | null): string {
  if (!value) return "Sin fecha";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "Sin fecha";
  return new Intl.DateTimeFormat("es-DO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export default function AdminVisits() {
  const { companyProfile } = useAuth();
  const companyId = companyProfile?.id ?? null;
  const [visits, setVisits] = useState<TicketVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setVisits([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);

    listTicketVisits(companyId)
      .then((data) => {
        if (!active) return;
        setVisits(data);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "No se pudieron cargar las visitas.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [companyId]);

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Visitas tecnicas</h1>
        <p className="mt-1 text-sm text-slate-500">Agenda y seguimiento de visitas.</p>
      </header>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Cargando visitas...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && visits.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <EmptyState text="No hay visitas programadas." />
        </div>
      )}

      {!loading && !error && visits.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-200 table-auto text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Ticket</th>
                  <th className="px-4 py-3">Tecnico</th>
                  <th className="px-4 py-3">Programada</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Completada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {visits.map((visit) => (
                  <tr key={visit.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-slate-700">{visit.ticketId.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {visit.technicianName ?? visit.technicianId ?? "Sin asignar"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(visit.scheduledAt)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {visit.completedAt ? "Completada" : "Pendiente"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {visit.completedAt ? formatDateTime(visit.completedAt) : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
