import { Wrench } from "lucide-react";
import EmptyState from "../../../../components/EmptyState";
import type { VisitsSectionProps } from "../../../../types/customerProfile360.types";

export default function VisitsSection({ visits }: VisitsSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <Wrench size={16} />
        Visitas tecnicas
      </h2>
      <div className="mt-4 space-y-2">
        {visits.length === 0 ? (
          <EmptyState text="No hay visitas tecnicas." />
        ) : (
          visits.map((visit) => (
            <div key={visit.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">{visit.title}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
