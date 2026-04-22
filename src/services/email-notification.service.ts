import { supabase } from "../libs/supabase";
import type {
  EmailAttachmentInput,
  SendEmailNotificationInput,
  SendEmailNotificationResult,
} from "../types/emailNotification";

export async function sendEmailNotification(
  payload: SendEmailNotificationInput
): Promise<SendEmailNotificationResult> {
  const { data, error } = await supabase.functions.invoke("send_email_notification", {
    body: payload,
  });

  if (error) {
    throw new Error(error.message || "No se pudo invocar la funcion de notificacion por correo.");
  }

  const result = (data ?? {}) as SendEmailNotificationResult & { error?: string };
  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

function formatMoney(value: number | null | undefined, currency: string | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const code = (currency ?? "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("es-DO", { style: "currency", currency: code }).format(value);
  } catch {
    return `${value.toFixed(2)} ${code}`;
  }
}

interface BillingNotificationInput {
  companyId: string;
  to: string | string[];
  customerName?: string | null;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export async function sendInvoiceIssuedNotification(
  input: BillingNotificationInput & {
    invoiceNumber: string;
    total?: number | null;
    currency?: string | null;
    issuedAt?: string | null;
    dueAt?: string | null;
  }
): Promise<SendEmailNotificationResult> {
  const amountLabel = formatMoney(input.total ?? null, input.currency ?? "USD");

  return sendEmailNotification({
    companyId: input.companyId,
    to: input.to,
    type: "transaction",
    eventKey: "invoice.issued",
    templateKey: "invoice_issued",
    entityType: input.entityType ?? "invoice",
    entityId: input.entityId,
    title: "Factura emitida",
    message: amountLabel
      ? `Hola ${input.customerName ?? "cliente"}, emitimos tu factura ${input.invoiceNumber} por ${amountLabel}.`
      : `Hola ${input.customerName ?? "cliente"}, emitimos tu factura ${input.invoiceNumber}.`,
    actionUrl: input.actionUrl,
    metadata: {
      invoiceNumber: input.invoiceNumber,
      total: input.total ?? null,
      currency: input.currency ?? "USD",
      issuedAt: input.issuedAt ?? null,
      dueAt: input.dueAt ?? null,
      ...(input.metadata ?? {}),
    },
  });
}

export async function sendPaymentReceivedNotification(
  input: BillingNotificationInput & {
    paymentReference?: string | null;
    invoiceNumber?: string | null;
    amount?: number | null;
    currency?: string | null;
    paidAt?: string | null;
  }
): Promise<SendEmailNotificationResult> {
  const amountLabel = formatMoney(input.amount ?? null, input.currency ?? "USD");

  return sendEmailNotification({
    companyId: input.companyId,
    to: input.to,
    type: "transaction",
    eventKey: "payment.received",
    templateKey: "payment_received",
    entityType: input.entityType ?? "payment",
    entityId: input.entityId,
    title: "Pago recibido",
    message: amountLabel
      ? `Hola ${input.customerName ?? "cliente"}, recibimos tu pago por ${amountLabel}.`
      : `Hola ${input.customerName ?? "cliente"}, registramos tu pago correctamente.`,
    actionUrl: input.actionUrl,
    metadata: {
      paymentReference: input.paymentReference ?? null,
      invoiceNumber: input.invoiceNumber ?? null,
      amount: input.amount ?? null,
      currency: input.currency ?? "USD",
      paidAt: input.paidAt ?? null,
      ...(input.metadata ?? {}),
    },
  });
}

export async function fileToEmailAttachment(file: File): Promise<EmailAttachmentInput> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("No se pudo convertir el archivo a base64."));
        return;
      }

      const [, encoded = ""] = result.split(",");
      resolve(encoded);
    };

    reader.onerror = () => {
      reject(new Error("Error leyendo el archivo para adjuntar."));
    };

    reader.readAsDataURL(file);
  });

  return {
    filename: file.name,
    contentBase64: base64,
    contentType: file.type || "application/octet-stream",
  };
}
