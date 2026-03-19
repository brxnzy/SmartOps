import type  { KpiGridProps } from "../types/interfaces";
import { formatMoney } from "../utils/utils";


export default function KpiGrid({ kpis }: KpiGridProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2">
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">MRR estimado</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">{formatMoney(4500, "DOP")}</p>
      </article>
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Sitios</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">{kpis.sites}</p>
      </article>
    </section>
  );
}
