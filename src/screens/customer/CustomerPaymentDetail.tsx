import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { Download, FileText, Receipt, UploadCloud } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import Field from "../../components/Field";
import FileInput from "../../components/FileInput";
import Modal from "../../components/Modal";
import { useAuth } from "../../hooks/useAuth";
import { notifications } from "../../services/notification.service";
import {
  generatePaymentStatement,
  getPaymentAccountDetail,
  getPaymentDocumentUrl,
  submitTransferPayment,
} from "../../services/payments.service";
import type { PaymentAccountDetail } from "../../types/payment.types";
import { formatPaymentAmount } from "../../utils/paymentFormatting";

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("es-DO");
}

function statusClass(status: string) {
  if (status === "paid") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "partial") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function transactionStatusClass(status: string) {
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function CustomerPaymentDetail() {
  const navigate = useNavigate();
  const { accountId } = useParams<{ accountId: string }>();
  const { authUser } = useAuth();
  const customerId = authUser?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<PaymentAccountDetail | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofInputKey, setProofInputKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!accountId || !customerId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getPaymentAccountDetail(accountId);
      setAccount(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la factura.");
    } finally {
      setLoading(false);
    }
  }, [accountId, customerId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

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

  const handleSubmitTransfer = async () => {
    if (!account) return;
    if (!proofFile) {
      notifications.warning({
        title: "Comprobante requerido",
        description: "Adjunta una captura o comprobante del pago.",
      });
      return;
    }

    setSubmitting(true);
    try {
      await submitTransferPayment({
        accountId: account.id,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
        proofFile,
      });
      setModalOpen(false);
      setReference("");
      setNotes("");
      setProofFile(null);
      setProofInputKey((current) => current + 1);
      await loadDetail();
      notifications.success({
        title: "Pago enviado",
        description: "Tu comprobante fue enviado para revision del administrador.",
      });
    } catch (err) {
      notifications.error({
        title: "Error enviando comprobante",
        description: err instanceof Error ? err.message : "No se pudo enviar el comprobante.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateStatement = async () => {
    if (!account) return;
    try {
      const result = await generatePaymentStatement(account.id);
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

  const onProofChange = (event: ChangeEvent<HTMLInputElement>) => {
    setProofFile(event.target.files?.[0] ?? null);
  };

  const approvedTransactions = useMemo(
    () => (account?.transactions ?? []).filter((transaction) => transaction.status === "approved"),
    [account?.transactions]
  );

  const transferRequests = useMemo(
    () =>
      (account?.transactions ?? []).filter(
        (transaction) => transaction.method === "bank_transfer" && transaction.status !== "approved"
      ),
    [account?.transactions]
  );

  const latestReceiptPath =
    approvedTransactions.find((transaction) => transaction.receiptPdfPath)?.receiptPdfPath ?? null;

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-900 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Button
              type="button"
              onClick={() => navigate("/customer/payments")}
              className="border-white/20 bg-white text-slate-900 hover:bg-slate-100"
            >
              Volver
            </Button>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Detalle de pago</h1>
            <p className="mt-2 text-sm text-slate-200">{account?.invoiceNumber ?? "Factura"}</p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(account?.status ?? "pending")}`}>
            {account?.status ?? "pending"}
          </span>
        </div>
      </header>

      {loading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Cargando detalle...
        </section>
      ) : error ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</section>
      ) : !account ? (
        <EmptyState text="No se encontro la cuenta seleccionada." />
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-3 md:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {formatPaymentAmount(account.amountTotal)}
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Pagado</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {formatPaymentAmount(account.amountPaid)}
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Pendiente</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {formatPaymentAmount(account.amountPending)}
                </p>
              </article>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {latestReceiptPath ? (
                <Button
                  type="button"
                  onClick={() => void openDocument(latestReceiptPath)}
                  className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                >
                  <Receipt size={16} />
                  Descargar recibo
                </Button>
              ) : null}
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
                onClick={() => setModalOpen(true)}
                disabled={account.status === "paid"}
                className="border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <UploadCloud size={16} />
                Solicitar transferencia
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Solicitudes de transferencia</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {transferRequests.length} registros
              </span>
            </div>

            {transferRequests.length === 0 ? (
              <div className="mt-4">
                <EmptyState text="No tienes solicitudes de transferencia pendientes o rechazadas." />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {transferRequests.map((transaction) => (
                  <article key={transaction.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {transaction.reference ?? `Solicitud ${transaction.id.slice(0, 8)}`}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDateTime(transaction.submittedAt)} · {transaction.method}
                        </p>
                        {transaction.reviewNotes ? (
                          <p className="mt-1 text-xs text-slate-500">Revision: {transaction.reviewNotes}</p>
                        ) : null}
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${transactionStatusClass(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {transaction.proofFilePath ? (
                        <Button
                          type="button"
                          onClick={() => void openDocument(transaction.proofFilePath)}
                          className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        >
                          <FileText size={16} />
                          Ver comprobante
                        </Button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Historial de transacciones</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {approvedTransactions.length} registros
              </span>
            </div>

            {approvedTransactions.length === 0 ? (
              <div className="mt-4">
                <EmptyState text="Todavia no tienes transacciones aprobadas para esta factura." />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {approvedTransactions.map((transaction) => (
                  <article key={transaction.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {transaction.reference ?? `Transaccion ${transaction.id.slice(0, 8)}`}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDateTime(transaction.approvedAt ?? transaction.submittedAt)} · {transaction.method}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Monto: {transaction.amount === null ? "Pendiente de validacion" : formatPaymentAmount(transaction.amount)}
                        </p>
                        {transaction.reviewNotes ? (
                          <p className="mt-1 text-xs text-slate-500">Revision: {transaction.reviewNotes}</p>
                        ) : null}
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${transactionStatusClass(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
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
                          <Receipt size={16} />
                          Descargar recibo
                        </Button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          if (submitting) return;
          setModalOpen(false);
          setProofFile(null);
          setProofInputKey((current) => current + 1);
        }}
        title="Solicitar pago por transferencia"
        subtitle="Sube tu comprobante y el administrador validara el monto aplicado."
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
              onClick={() => void handleSubmitTransfer()}
              disabled={submitting}
              className="border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {submitting ? "Enviando..." : "Enviar comprobante"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Adjunta el comprobante de tu transferencia. El monto final sera validado manualmente por administracion.
          </div>
          <Field label="Referencia de transferencia">
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none"
              placeholder="Opcional"
            />
          </Field>
          <Field label="Notas">
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none"
              placeholder="Informacion adicional opcional"
            />
          </Field>
          <FileInput
            key={proofInputKey}
            label="Comprobante"
            accept="image/*,application/pdf"
            onChange={onProofChange}
          />
        </div>
      </Modal>
    </section>
  );
}
