import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, FileText, WalletCards } from "lucide-react";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import { useAuth } from "../../hooks/useAuth";
import { generatePaymentStatement, getPaymentDocumentUrl, listCustomerPaymentAccounts } from "../../services/payments.service";
import type { PaymentAccountSummary } from "../../types/payment.types";
import { formatPaymentAmount } from "../../utils/paymentFormatting";

function statusClass(status: string) {
  if (status === "paid") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "partial") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

export default function CustomerPayments() {
  const navigate = useNavigate();
  const { authUser } = useAuth();
  const customerId = authUser?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<PaymentAccountSummary[]>([]);

  const loadAccounts = useCallback(async () => {
    if (!customerId) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await listCustomerPaymentAccounts(customerId);
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar tus pagos.");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const totals = useMemo(() => {
    return {
      pendingAmount: accounts.reduce((sum, item) => sum + item.amountPending, 0),
      pendingCount: accounts.filter((item) => item.status === "pending").length,
      partialCount: accounts.filter((item) => item.status === "partial").length,
      paidCount: accounts.filter((item) => item.status === "paid").length,
    };
  }, [accounts]);

  const openInvoice = async (path: string | null) => {
    if (!path) return;
    const url = await getPaymentDocumentUrl(path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const openStatement = async (accountId: string) => {
    const result = await generatePaymentStatement(accountId);
    if (result.pdfUrl) {
      window.open(result.pdfUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-900 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Mis pagos</h1>
            <p className="mt-2 text-sm text-slate-200">
              Consulta tus facturas, revisa saldos pendientes y descarga tus documentos.
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <WalletCards className="h-6 w-6" />
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <p className="text-sm text-blue-700">Pendiente total</p>
          <p className="mt-2 text-2xl font-semibold text-blue-900">{formatPaymentAmount(totals.pendingAmount)}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Facturas pendientes</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{totals.pendingCount}</p>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-sm text-amber-700">Por abonar</p>
          <p className="mt-2 text-2xl font-semibold text-amber-900">{totals.partialCount}</p>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-sm text-emerald-700">Saldadas</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-900">{totals.paidCount}</p>
        </article>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Facturas y pagos</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {accounts.length} registros
          </span>
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-slate-500">Cargando pagos...</div>
        ) : error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
        ) : accounts.length === 0 ? (
          <div className="mt-4">
            <EmptyState text="Todavia no tienes pagos registrados." />
          </div>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {accounts.map((account) => (
              <article
                key={account.id}
                className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{account.invoiceNumber}</p>
                    <p className="mt-1 text-xs text-slate-500">{account.siteName ?? "Instalacion"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Pendiente: {formatPaymentAmount(account.amountPending)}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(account.status)}`}>
                    {account.status}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => navigate(`/customer/payments/${account.id}`)}
                    className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  >
                    Ver detalle
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void openInvoice(account.invoicePdfPath)}
                    className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  >
                    <FileText size={16} />
                    Factura
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void openStatement(account.id)}
                    className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  >
                    <Download size={16} />
                    Estado
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
