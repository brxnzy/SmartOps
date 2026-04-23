import { supabase } from "../libs/supabase";
import type {
  PaymentAccountDetail,
  PaymentAccountSummary,
  PaymentTransaction,
} from "../types/payment.types";

function safeText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function safeNullableText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const normalized = safeText(value, "");
  return normalized || null;
}

function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function safeNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function pickSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message || "No se pudo validar la sesion.");

  let accessToken = data.session?.access_token ?? null;
  const expiresAt = data.session?.expires_at ?? null;
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (!accessToken || (typeof expiresAt === "number" && expiresAt <= nowSeconds + 30)) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      throw new Error(refreshError.message || "Sesion expirada. Vuelve a iniciar sesion.");
    }
    accessToken = refreshed.session?.access_token ?? null;
  }

  if (!accessToken) {
    throw new Error("Sesion expirada. Vuelve a iniciar sesion.");
  }

  return accessToken;
}

async function callPaymentsAction<T>(payload: Record<string, unknown>): Promise<T> {
  const accessToken = await getAccessToken();
  const { data, error } = await supabase.functions.invoke("payments_actions", {
    body: payload,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    throw new Error(error.message || "No se pudo completar la operacion de pagos.");
  }

  const result = (data ?? {}) as T & { error?: string };
  if (result && typeof result === "object" && "error" in result && result.error) {
    throw new Error(result.error);
  }

  return result as T;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("No se pudo leer el comprobante."));
        return;
      }
      resolve(result);
    };

    reader.onerror = () => {
      reject(new Error("No se pudo leer el comprobante."));
    };

    reader.readAsDataURL(file);
  });
}

function mapAccountRow(row: Record<string, unknown>): PaymentAccountSummary {
  const customer = pickSingle((row.users as unknown) as Record<string, unknown> | Record<string, unknown>[] | null);
  const project = pickSingle(
    (row.installation_projects as unknown) as Record<string, unknown> | Record<string, unknown>[] | null
  );
  const site = pickSingle(
    ((project as { customer_sites?: unknown } | null)?.customer_sites as unknown) as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | null
  );

  return {
    id: safeText(row.id),
    companyId: safeText(row.company_id),
    customerId: safeText(row.customer_id),
    projectId: safeText(row.project_id),
    budgetId: safeText(row.budget_id),
    status: safeText(row.status, "pending") as PaymentAccountSummary["status"],
    currency: safeText(row.currency, "USD"),
    amountTotal: safeNumber(row.amount_total),
    amountPaid: safeNumber(row.amount_paid),
    amountPending: safeNumber(row.amount_pending),
    invoiceNumber: safeText(row.invoice_number),
    invoicePdfPath: safeNullableText(row.invoice_pdf_path),
    invoiceIssuedAt: safeNullableText(row.invoice_issued_at),
    customerName: safeNullableText((customer as { name?: unknown } | null)?.name),
    customerIdCard: safeNullableText((customer as { id_card?: unknown } | null)?.id_card),
    siteName: safeNullableText((site as { name?: unknown } | null)?.name),
    createdAt: safeText(row.created_at, new Date().toISOString()),
    updatedAt: safeText(row.updated_at, new Date().toISOString()),
  };
}

function mapTransactionRow(row: Record<string, unknown>): PaymentTransaction {
  const customer = pickSingle((row.users as unknown) as Record<string, unknown> | Record<string, unknown>[] | null);
  const account = pickSingle(
    (row.payment_accounts as unknown) as Record<string, unknown> | Record<string, unknown>[] | null
  );
  const project = pickSingle(
    ((account as { installation_projects?: unknown } | null)?.installation_projects as unknown) as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | null
  );
  const site = pickSingle(
    ((project as { customer_sites?: unknown } | null)?.customer_sites as unknown) as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | null
  );

  const status = safeText(row.status, "submitted") as PaymentTransaction["status"];
  const rawAmount = safeNullableNumber(row.amount);
  return {
    id: safeText(row.id),
    accountId: safeText(row.payment_account_id),
    companyId: safeText(row.company_id),
    customerId: safeText(row.customer_id),
    method: safeText(row.method, "other") as PaymentTransaction["method"],
    status,
    amount: status === "submitted" ? null : rawAmount,
    reference: safeNullableText(row.reference),
    notes: safeNullableText(row.notes),
    proofFilePath: safeNullableText(row.proof_file_path),
    submittedAt: safeNullableText(row.submitted_at),
    approvedAt: safeNullableText(row.approved_at),
    rejectedAt: safeNullableText(row.rejected_at),
    reviewNotes: safeNullableText(row.review_notes),
    receiptNumber: safeNullableText(row.receipt_number),
    receiptPdfPath: safeNullableText(row.receipt_pdf_path),
    customerName: safeNullableText((customer as { name?: unknown } | null)?.name),
    invoiceNumber: safeNullableText((account as { invoice_number?: unknown } | null)?.invoice_number),
    accountPendingAmount: safeNumber((account as { amount_pending?: unknown } | null)?.amount_pending),
    accountTotalAmount: safeNumber((account as { amount_total?: unknown } | null)?.amount_total),
    accountStatus: safeText((account as { status?: unknown } | null)?.status, "pending") as PaymentTransaction["accountStatus"],
    siteName: safeNullableText((site as { name?: unknown } | null)?.name),
  };
}

export async function listPaymentAccounts(companyId: string): Promise<PaymentAccountSummary[]> {
  const { data, error } = await supabase
    .from("payment_accounts")
    .select(
      `
      id,
      company_id,
      customer_id,
      project_id,
      budget_id,
      status,
      currency,
      amount_total,
      amount_paid,
      amount_pending,
      invoice_number,
      invoice_pdf_path,
      invoice_issued_at,
      created_at,
      updated_at,
      users:customer_id ( name, id_card ),
      installation_projects:project_id ( customer_sites:site_id ( name ) )
      `
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "No se pudieron cargar las cuentas de pago.");
  }

  return (data ?? []).map((row) => mapAccountRow(row as Record<string, unknown>));
}

export async function listCustomerPaymentAccounts(customerId: string): Promise<PaymentAccountSummary[]> {
  const { data, error } = await supabase
    .from("payment_accounts")
    .select(
      `
      id,
      company_id,
      customer_id,
      project_id,
      budget_id,
      status,
      currency,
      amount_total,
      amount_paid,
      amount_pending,
      invoice_number,
      invoice_pdf_path,
      invoice_issued_at,
      created_at,
      updated_at,
      users:customer_id ( name, id_card ),
      installation_projects:project_id ( customer_sites:site_id ( name ) )
      `
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "No se pudieron cargar tus cuentas de pago.");
  }

  return (data ?? []).map((row) => mapAccountRow(row as Record<string, unknown>));
}

export async function getPaymentAccountDetail(accountId: string): Promise<PaymentAccountDetail> {
  const { data, error } = await supabase
    .from("payment_accounts")
    .select(
      `
      id,
      company_id,
      customer_id,
      project_id,
      budget_id,
      status,
      currency,
      amount_total,
      amount_paid,
      amount_pending,
      invoice_number,
      invoice_pdf_path,
      invoice_issued_at,
      created_at,
      updated_at,
      users:customer_id ( name, id_card ),
      installation_projects:project_id ( customer_sites:site_id ( name ) )
      `
    )
    .eq("id", accountId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message || "No se pudo cargar la cuenta.");
  }

  const account = mapAccountRow(data as Record<string, unknown>);

  const { data: transactionRows, error: transactionError } = await supabase
    .from("payment_transactions")
    .select(
      `
      id,
      payment_account_id,
      company_id,
      customer_id,
      method,
      status,
      amount,
      reference,
      notes,
      proof_file_path,
      submitted_at,
      approved_at,
      rejected_at,
      review_notes,
      receipt_number,
      receipt_pdf_path,
      users:customer_id ( name ),
      payment_accounts:payment_account_id (
        invoice_number,
        amount_pending,
        amount_total,
        status,
        installation_projects:project_id ( customer_sites:site_id ( name ) )
      )
      `
    )
    .eq("payment_account_id", accountId)
    .order("created_at", { ascending: false });

  if (transactionError) {
    throw new Error(transactionError.message || "No se pudieron cargar las transacciones.");
  }

  return {
    ...account,
    transactions: (transactionRows ?? []).map((row) => mapTransactionRow(row as Record<string, unknown>)),
  };
}

export async function listCompanyPaymentTransactions(companyId: string): Promise<PaymentTransaction[]> {
  const { data, error } = await supabase
    .from("payment_transactions")
    .select(
      `
      id,
      payment_account_id,
      company_id,
      customer_id,
      method,
      status,
      amount,
      reference,
      notes,
      proof_file_path,
      submitted_at,
      approved_at,
      rejected_at,
      review_notes,
      receipt_number,
      receipt_pdf_path,
      users:customer_id ( name ),
      payment_accounts:payment_account_id (
        invoice_number,
        amount_pending,
        amount_total,
        status,
        installation_projects:project_id ( customer_sites:site_id ( name ) )
      )
      `
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "No se pudieron cargar las transacciones.");
  }

  return (data ?? []).map((row) => mapTransactionRow(row as Record<string, unknown>));
}

export async function getPaymentDocumentUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from("payment_documents").createSignedUrl(path, 60 * 60 * 24 * 7);
  if (error) {
    throw new Error(error.message || "No se pudo generar el enlace del documento.");
  }
  return data?.signedUrl ?? null;
}

export async function submitTransferPayment(input: {
  accountId: string;
  reference?: string | null;
  notes?: string | null;
  proofFile: File;
}): Promise<{ transactionId: string }> {
  const proofBase64 = await fileToBase64(input.proofFile);
  return callPaymentsAction<{ transactionId: string }>({
    mode: "submit_transfer_payment",
    accountId: input.accountId,
    reference: input.reference ?? null,
    notes: input.notes ?? null,
    proofBase64,
    proofFilename: input.proofFile.name,
    proofContentType: input.proofFile.type || "application/octet-stream",
  });
}

export async function recordManualPayment(input: {
  accountId: string;
  amount: number;
  reference?: string | null;
  notes?: string | null;
}): Promise<{ transactionId: string }> {
  return callPaymentsAction<{ transactionId: string }>({
    mode: "record_manual_payment",
    accountId: input.accountId,
    amount: input.amount,
    reference: input.reference ?? null,
    notes: input.notes ?? null,
  });
}

export async function reviewPaymentTransaction(input: {
  transactionId: string;
  approved: boolean;
  approvedAmount?: number | null;
  reviewNotes?: string | null;
}): Promise<{ transactionId: string }> {
  return callPaymentsAction<{ transactionId: string }>({
    mode: "review_payment_transaction",
    transactionId: input.transactionId,
    approved: input.approved,
    approvedAmount: input.approvedAmount ?? null,
    reviewNotes: input.reviewNotes ?? null,
  });
}

export async function generatePaymentStatement(accountId: string): Promise<{ pdfUrl: string | null }> {
  return callPaymentsAction<{ pdfUrl: string | null }>({
    mode: "generate_statement",
    accountId,
  });
}
