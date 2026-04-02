import type  { KpiGridProps } from "../types/interfaces";

export default function KpiGrid({ kpis }: KpiGridProps) {
  const items = [
    { label: "Sitios", value: kpis.sites },
    { label: "Levantamientos", value: kpis.surveys },
    { label: "Cotizaciones", value: kpis.budgets },
    { label: "Proyectos", value: kpis.projects },
    { label: "Dispositivos instalados", value: kpis.devices },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => (
        <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{item.value}</p>
        </article>
      ))}
    </section>
  );
}
