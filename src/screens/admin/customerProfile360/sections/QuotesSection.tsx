import { BadgeDollarSign } from "lucide-react";
import EmptyState from "../../../../components/EmptyState";
import type { QuotesSectionProps } from "../../../../types/customerProfile360.types";


export default function QuotesSection({ quotes }: QuotesSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <BadgeDollarSign size={16} />
        Cotizaciones / Presupuestos
      </h2>
      <div className="mt-4 space-y-2">
        {quotes.length === 0 ? (
          <EmptyState text="No hay cotizaciones registradas." />
        ) : (
          quotes.map((quote) => (
            <div key={quote.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">
                {quote.code} - {quote.title}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
