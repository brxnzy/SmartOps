import { Ticket } from "lucide-react";
import EmptyState from "../../../../components/EmptyState";
import type { TicketsSectionProps } from "../../../../types/customerProfile360.types";

export default function TicketsSection({ tickets }: TicketsSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <Ticket size={16} />
        Tickets / Averias
      </h2>
      <div className="mt-4 space-y-2">
        {tickets.length === 0 ? (
          <EmptyState text="No hay tickets registrados." />
        ) : (
          tickets.map((ticket) => (
            <div key={ticket.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">
                {ticket.code} - {ticket.title}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
