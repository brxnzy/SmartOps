import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import { useAuth } from "../../hooks/useAuth";
import { listBudgetsForCustomer } from "../../services/budget.service";
import type { BudgetSummary } from "../../types/budget.types";

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-DO");
}

function statusClass(status: string) {
  switch (status) {
    case "aprobada":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rechazada":
      return "border-red-200 bg-red-50 text-red-700";
    case "expirada":
      return "border-slate-200 bg-slate-50 text-slate-600";
    case "enviada":
      return "border-blue-200 bg-blue-50 text-blue-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

export default function CustomerQuotes() {
  const navigate = useNavigate();
  const { authUser, companyProfile } = useAuth();
  const companyId = companyProfile?.id ?? null;
  const customerId = authUser?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<BudgetSummary[]>([]);

  const loadQuotes = useCallback(async () => {
    if (!companyId || !customerId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listBudgetsForCustomer(companyId, customerId);
      setQuotes(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudieron cargar las cotizaciones.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [companyId, customerId]);

  useEffect(() => {
    void loadQuotes();
  }, [loadQuotes]);

  const totals = useMemo(() => {
    const total = quotes.length;
    const approved = quotes.filter((quote) => quote.status === "aprobada").length;
    const pending = quotes.filter((quote) => quote.status === "enviada" || quote.status === "borrador").length;
    return { total, approved, pending };
  }, [quotes]);

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight">Mis cotizaciones</h1>
        <p className="mt-2 text-sm text-slate-200">Consulta y responde tus propuestas pendientes.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{totals.total}</p>
        </article>
        <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <p className="text-sm text-blue-600">Pendientes</p>
          <p className="mt-2 text-2xl font-semibold text-blue-800">{totals.pending}</p>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-sm text-emerald-600">Aprobadas</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{totals.approved}</p>
        </article>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Listado</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {quotes.length} registros
          </span>
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-slate-500">Cargando cotizaciones...</div>
        ) : error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : quotes.length === 0 ? (
          <div className="mt-4">
            <EmptyState text="No hay cotizaciones disponibles." />
          </div>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {quotes.map((quote) => (
                <article
                  key={quote.id}
                  className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{quote.siteName ?? "Sitio"}</p>
                    <p className="mt-1 text-xs text-slate-500">Creada: {formatDate(quote.createdAt)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Total: {quote.total.toLocaleString("es-DO", { style: "currency", currency: "USD" })}
                    </p>
                  </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(quote.status)}`}>
                      {quote.status}
                    </span>
                  </div>
                  {quote.quoteStatus === "enviada" ? (
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      Cotizacion enviada
                    </div>
                  ) : null}
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      onClick={() => navigate(`/customer/quotes/${quote.id}`)}
                      className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                    >
                    Ver detalle
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
