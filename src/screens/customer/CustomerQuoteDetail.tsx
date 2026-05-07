import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../../components/Button";
import Modal from "../../components/Modal";
import { useAuth } from "../../hooks/useAuth";
import { notifications } from "../../services/notification.service";
import { approveBudgetAsCustomer, getBudgetDetailForCustomer } from "../../services/budget.service";
import type { BudgetDetail } from "../../types/budget.types";

function formatCurrency(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return safeValue.toLocaleString("es-DO", { style: "currency", currency: "USD" });
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

export default function CustomerQuoteDetail() {
  const navigate = useNavigate();
  const { budgetId } = useParams<{ budgetId: string }>();
  const { authUser, companyProfile } = useAuth();
  const companyId = companyProfile?.id ?? null;
  const customerId = authUser?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState<BudgetDetail | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [decision, setDecision] = useState<"aprobar" | "rechazar">("aprobar");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!companyId || !customerId || !budgetId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getBudgetDetailForCustomer(budgetId, companyId, customerId);
      setBudget(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cargar la cotizacion.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [budgetId, companyId, customerId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const totals = useMemo(() => {
    if (!budget) {
      return {
        devicesSubtotal: 0,
        installationSubtotal: 0,
        extraChargesSubtotal: 0,
        subtotal: 0,
        taxAmount: 0,
        total: 0,
      };
    }
    return {
      devicesSubtotal: budget.devicesSubtotal,
      installationSubtotal: budget.installationSubtotal,
      extraChargesSubtotal: budget.extraChargesSubtotal,
      subtotal: budget.subtotal,
      taxAmount: budget.taxAmount,
      total: budget.total,
    };
  }, [budget]);

  const isExpired = useMemo(() => {
    if (!budget?.expiresAt) return false;
    return new Date(budget.expiresAt).getTime() <= Date.now();
  }, [budget?.expiresAt]);

  const canRespond = !isExpired && budget?.status === "enviada" && budget?.quoteStatus === "enviada";

  const openDecisionModal = (nextDecision: "aprobar" | "rechazar") => {
    setDecision(nextDecision);
    setNotes("");
    setModalOpen(true);
  };

  const confirmDecision = async () => {
    if (!budget) return;
    setSubmitting(true);
    try {
      await approveBudgetAsCustomer({
        budgetId: budget.id,
        decision,
        notes: notes.trim() || null,
      });
      setModalOpen(false);
      await loadDetail();
      notifications.success({
        title: "Estado actualizado",
        description: "La cotizacion fue actualizada.",
      });
    } catch (err) {
      notifications.error({
        title: "Error actualizando",
        description: err instanceof Error ? err.message : "No se pudo actualizar la cotizacion.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!budgetId) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Cotizacion no encontrada.</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Button
              type="button"
              onClick={() => navigate("/customer/quotes")}
              className="border-white/20 bg-white text-slate-900 hover:bg-slate-100"
            >
              Volver
            </Button>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Cotizacion</h1>
            <p className="mt-2 text-sm text-slate-200">{budget?.siteName ?? "Sitio"}</p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(budget?.status ?? "borrador")}`}>
            {budget?.status ?? "borrador"}
          </span>
        </div>
        {budget?.quoteStatus === "enviada" ? (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            Cotizacion enviada
          </div>
        ) : null}
      </header>

      {loading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Cargando cotizacion...
        </section>
      ) : error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</section>
      ) : budget ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Detalle</h2>
                <p className="text-xs text-slate-500">Revisa los dispositivos, la instalacion y los cargos adicionales.</p>
              </div>
              {canRespond ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => openDecisionModal("aprobar")}
                    className="border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Aprobar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => openDecisionModal("rechazar")}
                    className="border-red-600 bg-red-600 text-white hover:bg-red-700"
                  >
                    Rechazar
                  </Button>
                </div>
              ) : isExpired ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  Cotizacion expirada
                </span>
              ) : null}
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Dispositivo</th>
                    <th className="px-3 py-2">Zona</th>
                    <th className="px-3 py-2">Cantidad</th>
                    <th className="px-3 py-2">Precio equipo</th>
                    <th className="px-3 py-2">Instalacion</th>
                    <th className="px-3 py-2">Total linea</th>
                  </tr>
                </thead>
                <tbody>
                  {budget.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">
                        No hay dispositivos en la cotizacion.
                      </td>
                    </tr>
                  ) : (
                    budget.items.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-3 py-3 text-slate-800">
                          {item.deviceName ?? item.deviceModel ?? item.deviceId}
                        </td>
                        <td className="px-3 py-3 text-slate-600">{item.zoneName ?? "Sin zona"}</td>
                        <td className="px-3 py-3 text-slate-600">{item.quantity}</td>
                        <td className="px-3 py-3 text-slate-600">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-3 py-3 text-slate-600">{formatCurrency(item.installationUnitPrice)}</td>
                        <td className="px-3 py-3 font-semibold text-slate-800">
                          {formatCurrency(item.totalSubtotal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {budget.extraCharges.length > 0 ? (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900">Cargos adicionales</h3>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  {budget.extraCharges.map((charge) => (
                    <div key={charge.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                      <span>{charge.label}</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(charge.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Equipos {formatCurrency(totals.devicesSubtotal)} · Instalacion {formatCurrency(totals.installationSubtotal)} · Extras {formatCurrency(totals.extraChargesSubtotal)} · Impuestos {formatCurrency(totals.taxAmount)} · Total {formatCurrency(totals.total)}
            </div>
          </section>
        </>
      ) : null}

      <Modal
        open={modalOpen}
        onClose={() => {
          if (submitting) return;
          setModalOpen(false);
        }}
        title={decision === "aprobar" ? "Aprobar cotizacion" : "Rechazar cotizacion"}
        subtitle="Puedes agregar un comentario opcional."
        footer={
          <>
            <Button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={confirmDecision}
              disabled={submitting}
              className={
                decision === "aprobar"
                  ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                  : "border-red-600 bg-red-600 text-white hover:bg-red-700"
              }
            >
              {submitting ? "Guardando..." : "Confirmar"}
            </Button>
          </>
        }
      >
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="min-h-[120px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
          placeholder="Escribe un comentario (opcional)."
        />
      </Modal>
    </section>
  );
}
