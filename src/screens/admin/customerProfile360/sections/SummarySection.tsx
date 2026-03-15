import { Building2, CalendarClock } from "lucide-react";
import type { Customer360BasicProfile, CustomerTimelineEvent } from "../../../../types/customerProfile360.types";
import EmptyState from "../../../../components/EmptyState";
import { formatDate } from "../utils";

interface SummarySectionProps {
  profile: Customer360BasicProfile;
  timeline: CustomerTimelineEvent[];
}

export default function SummarySection({ profile, timeline }: SummarySectionProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-5">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <Building2 size={16} />
          Detalles de contacto
        </h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-slate-500">Representante</dt>
            <dd className="font-medium text-slate-800">{profile.name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Email de invitacion</dt>
            <dd className="font-medium text-slate-800">{profile.invitationEmail ?? "No definido"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Telefono principal</dt>
            <dd className="font-medium text-slate-800">{profile.phone ?? "N/A"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Tax ID</dt>
            <dd className="font-medium text-slate-800">{profile.taxId}</dd>
          </div>
        </dl>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <CalendarClock size={16} />
          Linea de tiempo de actividad
        </h2>
        <div className="mt-4 space-y-3">
          {timeline.length === 0 ? (
            <EmptyState text="No hay eventos para este cliente." />
          ) : (
            timeline.slice(0, 12).map((event) => (
              <div key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-slate-800">{event.title}</p>
                  <span className="text-xs text-slate-500">{formatDate(event.at)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{event.description}</p>
              </div>
            ))
          )}
        </div>
      </article>
    </section>
  );
}
