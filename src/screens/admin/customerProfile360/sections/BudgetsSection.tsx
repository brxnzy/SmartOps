import EmptyState from "../../../../components/EmptyState";
import type { CustomerBudgetSummary } from "../../../../types/customerProfile360.types";

interface BudgetsSectionProps {
  budgets: CustomerBudgetSummary[];
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("es-DO");
}

function formatCurrency(value: number): string {
  return value.toLocaleString("es-DO", { style: "currency", currency: "USD" });
}

export default function BudgetsSection({ budgets }: BudgetsSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Cotizaciones y presupuestos</h2>
      {budgets.length === 0 ? (
        <div className="mt-4">
          <EmptyState text="No hay cotizaciones registradas para este cliente." />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Cotizacion</th>
                <th className="px-3 py-2">Sitio</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Enviada</th>
                <th className="px-3 py-2">Aprobada/Rechazada</th>
              </tr>
            </thead>
            <tbody>
              {budgets.map((budget) => (
                <tr key={budget.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-3 py-3">{budget.status}</td>
                  <td className="px-3 py-3">{budget.quoteStatus ?? "-"}</td>
                  <td className="px-3 py-3">{budget.siteName ?? "-"}</td>
                  <td className="px-3 py-3 font-semibold text-slate-800">{formatCurrency(budget.total)}</td>
                  <td className="px-3 py-3">{formatDateTime(budget.sentAt)}</td>
                  <td className="px-3 py-3">{formatDateTime(budget.approvedAt ?? budget.rejectedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
