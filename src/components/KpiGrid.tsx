import type  { KpiGridProps } from "../types/interfaces";
import { formatMoney } from "../screens/admin/customerProfile360/utils";


export default function KpiGrid({ kpis }: KpiGridProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">MRR estimado</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">{formatMoney(4500, "DOP")}</p>
      </article>
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Open Tickets</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">{kpis.openTickets}</p>
      </article>
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Visitas tecnicas</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">{kpis.technicalVisits}</p>
      </article>
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Facturas pendientes</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">{kpis.pendingInvoices}</p>
      </article>
    </section>
  );
}
