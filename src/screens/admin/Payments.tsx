import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Receipt,
  RefreshCcw,
  Search,
  WalletCards,
  XCircle,
} from "lucide-react";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import Field from "../../components/Field";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import { PERMISSIONS } from "../../constants/permissions";
import { useAuth } from "../../hooks/useAuth";
import { notifications } from "../../services/notification.service";
import {
  generatePaymentStatement,
  getPaymentAccountDetail,
  getPaymentDocumentUrl,
  listCompanyPaymentTransactions,
  listPaymentAccounts,
  recordManualPayment,
  reviewPaymentTransaction,
} from "../../services/payments.service";
import type { PaymentAccountDetail, PaymentTransaction } from "../../types/payment.types";
import { formatPaymentAmount, sanitizeMoneyInput } from "../../utils/paymentFormatting";

type PaymentsTab = "accounts" | "requests" | "history";

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("es-DO");
}

function formatPaymentStatus(status: string) {
  if (status === "pending") return "Pendiente";
  if (status === "partial") return "Por abonar";
  if (status === "paid") return "Saldada";
  if (status === "cancelled") return "Cancelada";
  return status;
}

function formatTransactionStatus(status: string) {
  if (status === "submitted") return "Solicitud enviada";
  if (status === "approved") return "Aprobada";
  if (status === "rejected") return "Rechazada";
  return status;
}

function formatMethod(method: string) {
  if (method === "cash") return "Efectivo";
  if (method === "bank_transfer") return "Transferencia";
  if (method === "card") return "Tarjeta";
  return "Otros";
}

function accountStatusClass(status: string) {
  if (status === "paid") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "partial") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "cancelled") return "border-slate-200 bg-slate-100 text-slate-500";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function transactionStatusClass(status: string) {
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function transactionAmountLabel(transaction: PaymentTransaction) {
  return transaction.amount === null ? "Pendiente de validacion" : formatPaymentAmount(transaction.amount);
}

export default function Payments() {
  const { companyProfile, canAccess } = useAuth();
  const companyId = companyProfile?.id ?? null;
  const canCreateManual = canAccess(PERMISSIONS.paymentsCreateManual);
  const canReview = canAccess(PERMISSIONS.paymentsReview);

  const [activeTab, setActiveTab] = useState<PaymentsTab>("accounts");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [accounts, setAccounts] = useState<PaymentAccountDetail[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualAmount, setManualAmount] = useState("");
  const [manualReference, setManualReference] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<PaymentTransaction | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"approve" | "reject">("approve");
  const [reviewAmount, setReviewAmount] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!companyId) {
      setAccounts([]);
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [accountSummaries, transactionList] = await Promise.all([
        listPaymentAccounts(companyId),
        listCompanyPaymentTransactions(companyId),
      ]);
      const details = await Promise.all(accountSummaries.map((account) => getPaymentAccountDetail(account.id)));
      setAccounts(details);
      setTransactions(transactionList);
      if (details.length > 0) {
        setSelectedAccountId((current) =>
          current && details.some((item) => item.id === current) ? current : (details[0]?.id ?? null)
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el modulo de pagos.");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return accounts;

    return accounts.filter((account) =>
      [account.customerName ?? "", account.invoiceNumber, account.siteName ?? "", account.customerIdCard ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [accounts, search]);

  const selectedAccount =
    filteredAccounts.find((account) => account.id === selectedAccountId) ??
    accounts.find((account) => account.id === selectedAccountId) ??
    filteredAccounts[0] ??
    null;

  const submittedTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.status === "submitted"),
    [transactions]
  );

  const filteredRequests = useMemo(() => {
    const query = requestSearch.trim().toLowerCase();
    if (!query) return submittedTransactions;

    return submittedTransactions.filter((transaction) =>
      [
        transaction.customerName ?? "",
        transaction.invoiceNumber ?? "",
        transaction.reference ?? "",
        transaction.siteName ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [requestSearch, submittedTransactions]);

  const filteredHistory = useMemo(() => {
    const approvedTransactions = transactions.filter((transaction) => transaction.status === "approved");
    const query = historySearch.trim().toLowerCase();
    if (!query) return approvedTransactions;

    return approvedTransactions.filter((transaction) =>
      [
        transaction.customerName ?? "",
        transaction.invoiceNumber ?? "",
        transaction.reference ?? "",
        transaction.siteName ?? "",
        formatMethod(transaction.method),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [historySearch, transactions]);

  const kpis = useMemo(() => {
    const pendingAccounts = accounts.filter((account) => account.status === "pending").length;
    const partialAccounts = accounts.filter((account) => account.status === "partial").length;
    const paidAccounts = accounts.filter((account) => account.status === "paid").length;
    const totalPendingAmount = accounts.reduce((sum, account) => sum + account.amountPending, 0);
    return {
      pendingAccounts,
      partialAccounts,
      paidAccounts,
      submittedTransactions: submittedTransactions.length,
      totalPendingAmount,
    };
  }, [accounts, submittedTransactions.length]);

  const openDocument = async (path: string | null) => {
    if (!path) return;
    try {
      const url = await getPaymentDocumentUrl(path);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      notifications.error({
        title: "Error descargando",
        description: err instanceof Error ? err.message : "No se pudo abrir el documento.",
      });
    }
  };

  const handleGenerateStatement = async () => {
    if (!selectedAccount) return;
    try {
      const result = await generatePaymentStatement(selectedAccount.id);
      if (result.pdfUrl) {
        window.open(result.pdfUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      notifications.error({
        title: "Error generando estado",
        description: err instanceof Error ? err.message : "No se pudo generar el estado de cuenta.",
      });
    }
  };

  const handleManualPayment = async () => {
    if (!selectedAccount) return;

    const amount = Number(manualAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      notifications.warning({
        title: "Monto invalido",
        description: "Indica un monto mayor que cero para registrar el pago manual.",
      });
      return;
    }
    if (amount > selectedAccount.amountPending) {
      notifications.warning({
        title: "Monto excedido",
        description: "El pago manual no puede superar el saldo pendiente de la cuenta.",
      });
      return;
    }

    setManualSubmitting(true);
    try {
      await recordManualPayment({
        accountId: selectedAccount.id,
        amount,
        reference: manualReference.trim() || null,
        notes: manualNotes.trim() || null,
      });
      setManualModalOpen(false);
      setManualAmount("");
      setManualReference("");
      setManualNotes("");
      await loadData();
      notifications.success({
        title: "Pago en efectivo registrado",
        description: "La transaccion se registro correctamente y la factura del pago ya esta disponible.",
      });
    } catch (err) {
      notifications.error({
        title: "Error registrando pago",
        description: err instanceof Error ? err.message : "No se pudo registrar el pago manual.",
      });
    } finally {
      setManualSubmitting(false);
    }
  };

  const openReviewModal = (transaction: PaymentTransaction) => {
    setReviewTarget(transaction);
    setReviewDecision("approve");
    setReviewNotes("");
    setReviewAmount("");
    setReviewModalOpen(true);
  };

  const handleReview = async (decision: "approve" | "reject") => {
    if (!reviewTarget) return;

    const approvedAmount = Number(reviewAmount);
    if (decision === "approve") {
      if (!Number.isFinite(approvedAmount) || approvedAmount <= 0) {
        notifications.warning({
          title: "Monto invalido",
          description: "Debes indicar el monto validado del comprobante para aprobar la solicitud.",
        });
        return;
      }
      if (approvedAmount > reviewTarget.accountPendingAmount) {
        notifications.warning({
          title: "Monto excedido",
          description: "El monto aprobado no puede superar el saldo pendiente de la factura.",
        });
        return;
      }
    }

    setReviewSubmitting(true);
    setReviewDecision(decision);
    try {
      await reviewPaymentTransaction({
        transactionId: reviewTarget.id,
        approved: decision === "approve",
        approvedAmount: decision === "approve" ? approvedAmount : null,
        reviewNotes: reviewNotes.trim() || null,
      });
      setReviewModalOpen(false);
      setReviewTarget(null);
      setReviewNotes("");
      setReviewAmount("");
      await loadData();
      notifications.success({
        title: decision === "approve" ? "Solicitud aprobada" : "Solicitud rechazada",
        description:
          decision === "approve"
            ? "La transferencia se aplico correctamente y se genero la factura del pago."
            : "La solicitud de transferencia fue rechazada.",
      });
    } catch (err) {
      notifications.error({
        title: "Error revisando solicitud",
        description: err instanceof Error ? err.message : "No se pudo revisar la transferencia.",
      });
    } finally {
      setReviewSubmitting(false);
    }
  };

  const tabs = [
    {
      id: "accounts" as const,
      label: "Cuentas",
      description: "Facturas, saldos y pagos manuales.",
      count: filteredAccounts.length,
    },
    {
      id: "requests" as const,
      label: "Solicitudes de transferencia",
      description: "Comprobantes pendientes de revision.",
      count: submittedTransactions.length,
    },
    {
      id: "history" as const,
      label: "Historial",
      description: "Todas las transacciones registradas.",
      count: transactions.length,
    },
  ];

  return (
    <section className="space-y-6">
      <header className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_36%),linear-gradient(135deg,_#0f172a,_#111827_55%,_#064e3b)] p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-200/80">Pagos</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Cobros, solicitudes y transacciones</h1>
            <p className="mt-2 text-sm text-slate-200">
              Administra cuentas pendientes, valida comprobantes de transferencia y descarga la factura de cada pago aplicado.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="border-white/15 bg-white text-slate-900 hover:bg-slate-100"
          >
            <RefreshCcw size={16} />
            Recargar
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <p className="text-sm text-blue-700">Pendientes</p>
          <p className="mt-2 text-2xl font-semibold text-blue-900">{kpis.pendingAccounts}</p>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-sm text-amber-700">Por abonar</p>
          <p className="mt-2 text-2xl font-semibold text-amber-900">{kpis.partialAccounts}</p>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-sm text-emerald-700">Saldadas</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-900">{kpis.paidAccounts}</p>
        </article>
        <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
          <p className="text-sm text-rose-700">Solicitudes</p>
          <p className="mt-2 text-2xl font-semibold text-rose-900">{kpis.submittedTransactions}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Saldo pendiente</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{formatPaymentAmount(kpis.totalPendingAmount)}</p>
        </article>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-3">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-[22px] border px-4 py-4 text-left transition ${
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{tab.label}</p>
                    <p className={`mt-1 text-xs ${isActive ? "text-slate-300" : "text-slate-500"}`}>{tab.description}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      isActive ? "bg-white/10 text-white" : "bg-white text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {activeTab === "accounts" ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_1.9fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Facturas activas</h2>
                  <p className="text-sm text-slate-500">Busca por cliente, factura, sitio o cédula.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {filteredAccounts.length} registros
                </span>
              </div>

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar cuenta..."
                icon={<Search size={16} />}
              />
            </div>

            {loading ? (
              <div className="mt-4 text-sm text-slate-500">Cargando cuentas...</div>
            ) : error ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
            ) : filteredAccounts.length === 0 ? (
              <div className="mt-4">
                <EmptyState text="No hay cuentas de pago registradas todavia." />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {filteredAccounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => setSelectedAccountId(account.id)}
                    className={`w-full rounded-[24px] border p-4 text-left shadow-sm transition ${
                      selectedAccount?.id === account.id
                        ? "border-emerald-300 bg-emerald-50/70"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{account.customerName ?? "Cliente"}</p>
                        <p className="mt-1 text-xs text-slate-500">{account.invoiceNumber}</p>
                        <p className="mt-1 text-xs text-slate-500">{account.siteName ?? "Sitio no definido"}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${accountStatusClass(account.status)}`}>
                        {formatPaymentStatus(account.status)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-3 text-xs text-slate-600">
                      <div className="rounded-2xl bg-white px-3 py-2">
                        <span className="block text-[11px] uppercase tracking-wide text-slate-400">Total</span>
                        <span className="mt-1 block font-semibold text-slate-800">{formatPaymentAmount(account.amountTotal)}</span>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-2">
                        <span className="block text-[11px] uppercase tracking-wide text-slate-400">Pagado</span>
                        <span className="mt-1 block font-semibold text-slate-800">{formatPaymentAmount(account.amountPaid)}</span>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-2">
                        <span className="block text-[11px] uppercase tracking-wide text-slate-400">Pendiente</span>
                        <span className="mt-1 block font-semibold text-slate-800">{formatPaymentAmount(account.amountPending)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            {!selectedAccount ? (
              <EmptyState text="Selecciona una cuenta para revisar su detalle." />
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">Factura</p>
                    <h2 className="text-2xl font-semibold text-slate-900">{selectedAccount.invoiceNumber}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedAccount.customerName ?? "Cliente"} · {selectedAccount.siteName ?? "Sitio"}
                    </p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${accountStatusClass(selectedAccount.status)}`}>
                    {formatPaymentStatus(selectedAccount.status)}
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900">{formatPaymentAmount(selectedAccount.amountTotal)}</p>
                  </article>
                  <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Pagado</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900">{formatPaymentAmount(selectedAccount.amountPaid)}</p>
                  </article>
                  <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Pendiente</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900">{formatPaymentAmount(selectedAccount.amountPending)}</p>
                  </article>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => void openDocument(selectedAccount.invoicePdfPath)}
                    className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  >
                    <FileText size={16} />
                    Descargar factura
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleGenerateStatement()}
                    className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  >
                    <Download size={16} />
                    Estado de cuenta PDF
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setManualModalOpen(true)}
                    disabled={!canCreateManual || selectedAccount.status === "paid"}
                    className="border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <WalletCards size={16} />
                    Registrar pago en efectivo
                  </Button>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Movimientos de la cuenta</h3>
                      <p className="text-sm text-slate-500">Aqui ves el saldo actual, los pagos aplicados y las solicitudes pendientes de esta factura.</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                      {selectedAccount.transactions.length} transacciones
                    </span>
                  </div>

                  {selectedAccount.transactions.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-500">Aun no hay movimientos para esta factura.</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {selectedAccount.transactions.map((transaction) => (
                        <article key={transaction.id} className="rounded-[24px] border border-slate-200 bg-white p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {transaction.reference ?? `Movimiento ${transaction.id.slice(0, 8)}`}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatDateTime(transaction.approvedAt ?? transaction.submittedAt)} · {formatMethod(transaction.method)}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">Monto: {transactionAmountLabel(transaction)}</p>
                              {transaction.reviewNotes ? (
                                <p className="mt-1 text-xs text-slate-500">Revision: {transaction.reviewNotes}</p>
                              ) : null}
                            </div>
                            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${transactionStatusClass(transaction.status)}`}>
                              {formatTransactionStatus(transaction.status)}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {transaction.proofFilePath ? (
                              <Button
                                type="button"
                                onClick={() => void openDocument(transaction.proofFilePath)}
                                className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                              >
                                <Eye size={16} />
                                Ver comprobante
                              </Button>
                            ) : null}
                            {transaction.receiptPdfPath ? (
                              <Button
                                type="button"
                                onClick={() => void openDocument(transaction.receiptPdfPath)}
                                className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                              >
                                <Receipt size={16} />
                                Descargar factura del pago
                              </Button>
                            ) : null}
                            {transaction.status === "submitted" ? (
                              <Button
                                type="button"
                                onClick={() => openReviewModal(transaction)}
                                disabled={!canReview}
                                className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                              >
                                Revisar solicitud
                              </Button>
                            ) : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {activeTab === "requests" ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Solicitudes de transferencia</h2>
              <p className="text-sm text-slate-500">Valida comprobantes y asigna manualmente el monto aprobado.</p>
            </div>
            <div className="w-full lg:max-w-md">
              <Input
                value={requestSearch}
                onChange={(event) => setRequestSearch(event.target.value)}
                placeholder="Buscar solicitud..."
                icon={<Search size={16} />}
              />
            </div>
          </div>

          {loading ? (
            <div className="mt-4 text-sm text-slate-500">Cargando solicitudes...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="mt-4">
              <EmptyState text="No hay solicitudes de transferencia pendientes por revisar." />
            </div>
          ) : (
            <>
              <div className="mt-4 grid gap-3 lg:hidden">
                {filteredRequests.map((transaction) => (
                  <article key={transaction.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{transaction.customerName ?? "Cliente"}</p>
                        <p className="mt-1 text-xs text-slate-500">{transaction.invoiceNumber ?? "-"}</p>
                        <p className="mt-1 text-xs text-slate-500">{transaction.siteName ?? "Sitio no definido"}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${transactionStatusClass(transaction.status)}`}>
                        {formatTransactionStatus(transaction.status)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 text-xs text-slate-600">
                      <div>Fecha: {formatDateTime(transaction.submittedAt)}</div>
                      <div>Referencia: {transaction.reference ?? "Sin referencia"}</div>
                      <div>Saldo pendiente: {formatPaymentAmount(transaction.accountPendingAmount)}</div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {transaction.proofFilePath ? (
                        <Button
                          type="button"
                          onClick={() => void openDocument(transaction.proofFilePath)}
                          className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        >
                          <Eye size={16} />
                          Ver comprobante
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        onClick={() => openReviewModal(transaction)}
                        disabled={!canReview}
                        className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Revisar solicitud
                      </Button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-4 hidden overflow-x-auto lg:block">
                <table className="min-w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Cliente</th>
                      <th className="px-3 py-2">Factura</th>
                      <th className="px-3 py-2">Sitio</th>
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2">Referencia</th>
                      <th className="px-3 py-2">Pendiente</th>
                      <th className="px-3 py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((transaction) => (
                      <tr key={transaction.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-3 py-3 font-medium text-slate-800">{transaction.customerName ?? "-"}</td>
                        <td className="px-3 py-3">{transaction.invoiceNumber ?? "-"}</td>
                        <td className="px-3 py-3">{transaction.siteName ?? "-"}</td>
                        <td className="px-3 py-3 text-xs text-slate-500">{formatDateTime(transaction.submittedAt)}</td>
                        <td className="px-3 py-3">{transaction.reference ?? "-"}</td>
                        <td className="px-3 py-3 font-semibold text-slate-800">
                          {formatPaymentAmount(transaction.accountPendingAmount)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            {transaction.proofFilePath ? (
                              <Button
                                type="button"
                                onClick={() => void openDocument(transaction.proofFilePath)}
                                className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                              >
                                Ver comprobante
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              onClick={() => openReviewModal(transaction)}
                              disabled={!canReview}
                              className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                            >
                              Revisar solicitud
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      ) : null}

      {activeTab === "history" ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Historial de transacciones</h2>
              <p className="text-sm text-slate-500">Descarga la factura del pago generado para cada transaccion aprobada.</p>
            </div>
            <div className="w-full lg:max-w-md">
              <Input
                value={historySearch}
                onChange={(event) => setHistorySearch(event.target.value)}
                placeholder="Buscar en historial..."
                icon={<Search size={16} />}
              />
            </div>
          </div>

          {loading ? (
            <div className="mt-4 text-sm text-slate-500">Cargando historial...</div>
          ) : filteredHistory.length === 0 ? (
            <div className="mt-4">
              <EmptyState text="Aun no hay transacciones registradas." />
            </div>
          ) : (
            <>
              <div className="mt-4 grid gap-3 lg:hidden">
                {filteredHistory.map((transaction) => (
                  <article key={transaction.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{transaction.customerName ?? "Cliente"}</p>
                        <p className="mt-1 text-xs text-slate-500">{transaction.invoiceNumber ?? "-"}</p>
                        <p className="mt-1 text-xs text-slate-500">{transaction.siteName ?? "Sitio no definido"}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${transactionStatusClass(transaction.status)}`}>
                        {formatTransactionStatus(transaction.status)}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-2 text-xs text-slate-600">
                      <div>Fecha: {formatDateTime(transaction.approvedAt ?? transaction.submittedAt)}</div>
                      <div>Metodo: {formatMethod(transaction.method)}</div>
                      <div>Monto: {transactionAmountLabel(transaction)}</div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {transaction.proofFilePath ? (
                        <Button
                          type="button"
                          onClick={() => void openDocument(transaction.proofFilePath)}
                          className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        >
                          Ver comprobante
                        </Button>
                      ) : null}
                      {transaction.receiptPdfPath ? (
                        <Button
                          type="button"
                          onClick={() => void openDocument(transaction.receiptPdfPath)}
                          className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        >
                          Descargar factura del pago
                        </Button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-4 hidden overflow-x-auto lg:block">
                <table className="min-w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2">Cliente</th>
                      <th className="px-3 py-2">Factura</th>
                      <th className="px-3 py-2">Metodo</th>
                      <th className="px-3 py-2">Monto</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((transaction) => (
                      <tr key={transaction.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-3 py-3 text-xs text-slate-500">{formatDateTime(transaction.approvedAt ?? transaction.submittedAt)}</td>
                        <td className="px-3 py-3">{transaction.customerName ?? "-"}</td>
                        <td className="px-3 py-3">{transaction.invoiceNumber ?? "-"}</td>
                        <td className="px-3 py-3">{formatMethod(transaction.method)}</td>
                        <td className="px-3 py-3 font-semibold text-slate-800">{transactionAmountLabel(transaction)}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${transactionStatusClass(transaction.status)}`}>
                            {formatTransactionStatus(transaction.status)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            {transaction.proofFilePath ? (
                              <Button
                                type="button"
                                onClick={() => void openDocument(transaction.proofFilePath)}
                                className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                              >
                                Ver comprobante
                              </Button>
                            ) : null}
                            {transaction.receiptPdfPath ? (
                              <Button
                                type="button"
                                onClick={() => void openDocument(transaction.receiptPdfPath)}
                                className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                              >
                                Descargar factura del pago
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      ) : null}

      <Modal
        open={manualModalOpen}
        onClose={() => {
          if (manualSubmitting) return;
          setManualModalOpen(false);
        }}
        title="Registrar pago en efectivo"
        subtitle="Este formulario aplica solo para cobros manuales en efectivo desde administracion."
        footer={
          <>
            <Button
              type="button"
              onClick={() => setManualModalOpen(false)}
              disabled={manualSubmitting}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleManualPayment()}
              disabled={manualSubmitting}
              className="border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {manualSubmitting ? "Guardando..." : "Registrar pago"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            El sistema registrara esta transaccion como <span className="font-semibold">efectivo</span>.
          </div>
          <Field label="Monto recibido">
            <input
              inputMode="decimal"
              value={manualAmount}
              onChange={(event) =>
                setManualAmount(sanitizeMoneyInput(event.target.value, selectedAccount?.amountPending))
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none"
              placeholder="0.00"
            />
          </Field>
          <Field label="Referencia">
            <input
              value={manualReference}
              onChange={(event) => setManualReference(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none"
              placeholder="Opcional"
            />
          </Field>
          <Field label="Notas">
            <textarea
              value={manualNotes}
              onChange={(event) => setManualNotes(event.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none"
              placeholder="Detalle opcional del pago"
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={reviewModalOpen}
        onClose={() => {
          if (reviewSubmitting) return;
          setReviewModalOpen(false);
        }}
        title="Revisar solicitud de transferencia"
        subtitle="Valida el comprobante y define manualmente el monto que se aplicara a la cuenta."
        footer={
          <>
            <Button
              type="button"
              onClick={() => setReviewModalOpen(false)}
              disabled={reviewSubmitting}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleReview("reject")}
              disabled={reviewSubmitting}
              className="border-rose-600 bg-rose-600 text-white hover:bg-rose-700"
            >
              <XCircle size={16} />
              {reviewSubmitting && reviewDecision === "reject" ? "Rechazando..." : "Rechazar"}
            </Button>
            <Button
              type="button"
              onClick={() => void handleReview("approve")}
              disabled={reviewSubmitting}
              className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
            >
              <CheckCircle2 size={16} />
              {reviewSubmitting && reviewDecision === "approve" ? "Aprobando..." : "Aprobar"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="grid gap-3 md:grid-cols-2">
              <p><span className="font-semibold text-slate-800">Cliente:</span> {reviewTarget?.customerName ?? "-"}</p>
              <p><span className="font-semibold text-slate-800">Factura:</span> {reviewTarget?.invoiceNumber ?? "-"}</p>
              <p><span className="font-semibold text-slate-800">Fecha enviada:</span> {formatDateTime(reviewTarget?.submittedAt ?? null)}</p>
              <p><span className="font-semibold text-slate-800">Saldo pendiente:</span> {formatPaymentAmount(reviewTarget?.accountPendingAmount)}</p>
              <p><span className="font-semibold text-slate-800">Referencia:</span> {reviewTarget?.reference ?? "Sin referencia"}</p>
              <p><span className="font-semibold text-slate-800">Sitio:</span> {reviewTarget?.siteName ?? "No definido"}</p>
            </div>
          </div>

          {reviewTarget?.proofFilePath ? (
            <Button
              type="button"
              onClick={() => void openDocument(reviewTarget.proofFilePath)}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              <Eye size={16} />
              Ver comprobante
            </Button>
          ) : null}

          <Field label="Monto aprobado del comprobante">
            <input
              inputMode="decimal"
              value={reviewAmount}
              onChange={(event) =>
                setReviewAmount(sanitizeMoneyInput(event.target.value, reviewTarget?.accountPendingAmount))
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              placeholder="0.00"
            />
          </Field>

          <Field label="Notas de revision">
            <textarea
              value={reviewNotes}
              onChange={(event) => setReviewNotes(event.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              placeholder="Explica el criterio de aprobacion o rechazo"
            />
          </Field>
        </div>
      </Modal>
    </section>
  );
}
