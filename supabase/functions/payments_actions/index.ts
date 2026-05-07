import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import {
  buildDocumentNumber,
  buildInvoicePdf,
  buildReceiptPdf,
  buildStatementPdf,
  bytesToBase64,
  decodeBase64,
  fetchCustomerEmail,
  fetchPaymentAccountContext,
  fetchPaymentTransactionContext,
  fetchPaymentTransactionsByAccount,
  formatCurrency,
  paymentMethodLabel,
} from "../_shared/payment-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-service-role",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUBMITTED_TRANSFER_PLACEHOLDER_AMOUNT = 0.01;

type Mode =
  | "issue_account_invoice"
  | "ensure_project_payment_account"
  | "record_manual_payment"
  | "submit_transfer_payment"
  | "review_payment_transaction"
  | "generate_statement"
  | "send_daily_reminders";

type AuthContext = {
  adminClient: SupabaseClient;
  authUser: User | null;
  isServiceRole: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
  serviceRoleKey: string;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

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

function pickSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function extensionFromFilename(value: string | null | undefined, fallback = "pdf"): string {
  if (!value) return fallback;
  const part = value.split(".").pop()?.trim().toLowerCase();
  return part || fallback;
}

async function buildAuthContext(req: Request, allowCronSecret = false): Promise<AuthContext> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL, SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const authHeader = req.headers.get("Authorization") ?? "";
  const accessToken = authHeader.replace("Bearer ", "").trim();
  const apiKeyHeader = req.headers.get("apikey")?.trim() ?? "";
  const internalServiceKey = req.headers.get("x-internal-service-role")?.trim() ?? "";
  const cronSecret = req.headers.get("x-cron-secret")?.trim() ?? "";
  if (allowCronSecret && cronSecret) {
    const { data } = await adminClient
      .from("payment_scheduler_config")
      .select("cron_secret")
      .eq("id", true)
      .maybeSingle<{ cron_secret: string | null }>();

    if (data?.cron_secret && data.cron_secret === cronSecret) {
      return {
        adminClient,
        authUser: null,
        isServiceRole: true,
        supabaseUrl,
        supabaseAnonKey,
        serviceRoleKey,
      };
    }
  }

  if (!accessToken) {
    if (apiKeyHeader === serviceRoleKey || internalServiceKey === serviceRoleKey) {
      return {
        adminClient,
        authUser: null,
        isServiceRole: true,
        supabaseUrl,
        supabaseAnonKey,
        serviceRoleKey,
      };
    }

    throw new Error("Missing authorization header.");
  }

  const isServiceRole =
    accessToken === serviceRoleKey || apiKeyHeader === serviceRoleKey || internalServiceKey === serviceRoleKey;
  if (isServiceRole) {
    return {
      adminClient,
      authUser: null,
      isServiceRole,
      supabaseUrl,
      supabaseAnonKey,
      serviceRoleKey,
    };
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await authClient.auth.getUser(accessToken);
  if (error || !data.user) {
    throw new Error("Invalid access token.");
  }

  return {
    adminClient,
    authUser: data.user,
    isServiceRole,
    supabaseUrl,
    supabaseAnonKey,
    serviceRoleKey,
  };
}

async function ensureCompanyAccess(ctx: AuthContext, companyId: string) {
  if (ctx.isServiceRole) return;
  const userId = ctx.authUser?.id;
  if (!userId) throw new Error("No active user.");

  const { data, error } = await ctx.adminClient
    .from("user_roles")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message || "No se pudo validar acceso a la compania.");
  if (!data?.user_id) {
    const { data: globalAdmin } = await ctx.adminClient
      .from("user_roles")
      .select("user_id, roles:role_id ( name )")
      .eq("user_id", userId);

    const isGlobalAdmin = (globalAdmin ?? []).some((row) => {
      const roles = (row as { roles?: { name?: string } | Array<{ name?: string }> | null }).roles;
      if (!roles) return false;
      if (Array.isArray(roles)) {
        return roles.some((item) => safeText(item.name).toLowerCase() === "admin");
      }
      return safeText(roles.name).toLowerCase() === "admin";
    });

    if (!isGlobalAdmin) {
      throw new Error("No tienes acceso a la compania indicada.");
    }
  }
}

async function ensureCustomerAccountAccess(ctx: AuthContext, accountId: string) {
  const account = await fetchPaymentAccountContext(ctx.adminClient, accountId);
  if (!account) throw new Error("No se encontro la cuenta de pago.");

  if (!ctx.isServiceRole && ctx.authUser?.id !== account.customerId) {
    throw new Error("No puedes operar esta cuenta.");
  }

  return account;
}

async function uploadBytes(
  adminClient: SupabaseClient,
  path: string,
  bytes: Uint8Array,
  contentType: string
) {
  const { error } = await adminClient.storage.from("payment_documents").upload(path, bytes, {
    contentType,
    upsert: true,
  });

  if (error) throw new Error(error.message || "No se pudo subir el documento.");
}

async function createSignedUrl(adminClient: SupabaseClient, path: string): Promise<string | null> {
  const { data, error } = await adminClient.storage.from("payment_documents").createSignedUrl(path, 60 * 60 * 24 * 7);
  if (error) return null;
  return data?.signedUrl ?? null;
}

async function insertAuditLog(ctx: AuthContext, input: {
  action: string;
  entity: string;
  entityId?: string | null;
  companyId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  userId?: string | null;
}) {
  await ctx.adminClient.from("audit_logs").insert({
    user_id: input.userId ?? ctx.authUser?.id ?? null,
    company_id: input.companyId ?? null,
    action: input.action,
    entity: input.entity,
    entity_id: input.entityId ?? null,
    old_values: input.oldValues ?? null,
    new_values: input.newValues ?? null,
  });
}

async function sendEmail(
  ctx: AuthContext,
  payload: Record<string, unknown>
): Promise<void> {
  const response = await fetch(`${ctx.supabaseUrl}/functions/v1/send_email_notification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ctx.serviceRoleKey,
      "x-internal-service-role": ctx.serviceRoleKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const raw = await response.text().catch(() => "");
    throw new Error(raw || "No se pudo enviar el correo.");
  }
}

async function sendEmailSafely(
  ctx: AuthContext,
  payload: Record<string, unknown>,
  contextLabel: string
): Promise<void> {
  try {
    await sendEmail(ctx, payload);
  } catch (error) {
    console.error(`[payments_actions] ${contextLabel}`, error);
  }
}

async function issueAccountInvoice(ctx: AuthContext, payload: Record<string, unknown>) {
  const accountId = safeText(payload.accountId);
  const force = Boolean(payload.force);
  if (!accountId) throw new Error("accountId es requerido.");

  const account = await fetchPaymentAccountContext(ctx.adminClient, accountId);
  if (!account) throw new Error("No se encontro la cuenta.");

  if (!ctx.isServiceRole) {
    await ensureCompanyAccess(ctx, account.companyId);
  }

  if (account.invoicePdfPath && !force) {
    return {
      accountId: account.id,
      invoiceNumber: account.invoiceNumber,
      pdfUrl: await createSignedUrl(ctx.adminClient, account.invoicePdfPath),
      alreadyGenerated: true,
    };
  }

  const pdfBytes = await buildInvoicePdf(account);
  const filePath = `${account.companyId}/${account.customerId}/${account.id}/invoices/factura-${sanitizeFilename(account.invoiceNumber)}.pdf`;
  await uploadBytes(ctx.adminClient, filePath, pdfBytes, "application/pdf");

  const nowIso = new Date().toISOString();
  const { error } = await ctx.adminClient
    .from("payment_accounts")
    .update({
      invoice_pdf_path: filePath,
      invoice_issued_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", account.id);

  if (error) throw new Error(error.message || "No se pudo actualizar la factura.");

  await insertAuditLog(ctx, {
    action: "create",
    entity: "payment_invoice",
    entityId: account.id,
    companyId: account.companyId,
    newValues: {
      invoiceNumber: account.invoiceNumber,
      invoicePdfPath: filePath,
      amountTotal: account.amountTotal,
    },
  });

  const customerEmail = await fetchCustomerEmail(ctx.adminClient, account.customerId);
  const pdfUrl = await createSignedUrl(ctx.adminClient, filePath);

  if (customerEmail) {
    await sendEmail(ctx, {
      companyId: account.companyId,
      to: customerEmail,
      type: "transaction",
      eventKey: "payment.account_created",
      templateKey: "payment_invoice",
      entityType: "payment_account",
      entityId: account.id,
      subject: `Factura ${account.invoiceNumber}`,
      title: "Se genero un pago pendiente",
      message: `Hola ${account.customerName}, tu instalacion fue completada y se genero la factura ${account.invoiceNumber} por ${formatCurrency(account.amountTotal, account.currency)}.`,
      actionUrl: pdfUrl ?? undefined,
      metadata: {
        invoiceNumber: account.invoiceNumber,
        amountTotal: account.amountTotal,
        amountPending: account.amountPending,
        siteName: account.siteName,
      },
      attachments: [
        {
          filename: `factura-${account.invoiceNumber}.pdf`,
          contentBase64: bytesToBase64(pdfBytes),
          contentType: "application/pdf",
        },
      ],
    });
  }

  return {
    accountId: account.id,
    invoiceNumber: account.invoiceNumber,
    pdfUrl,
    alreadyGenerated: false,
  };
}

async function ensureProjectPaymentAccount(ctx: AuthContext, payload: Record<string, unknown>) {
  const projectId = safeText(payload.projectId);
  if (!projectId) throw new Error("projectId es requerido.");

  const { data: project, error: projectError } = await ctx.adminClient
    .from("installation_projects")
    .select(
      `
      id,
      company_id,
      budget_id,
      budgets:budget_id (
        id,
        total,
        site_surveys:survey_id (
          id,
          customer_id,
          customers:customer_id (
            user_id,
            users:users!customers_user_id_fkey ( id, name )
          )
        )
      )
    `
    )
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    throw new Error(projectError.message || "No se pudo validar el proyecto.");
  }
  if (!project) {
    throw new Error("No se encontro el proyecto.");
  }

  const companyId = safeText((project as { company_id?: unknown } | null)?.company_id);
  const budgetId = safeText((project as { budget_id?: unknown } | null)?.budget_id);
  const budget = pickSingle(
    (project as { budgets?: Record<string, unknown> | Record<string, unknown>[] | null | undefined }).budgets
  );
  const survey = pickSingle(
    (budget as { site_surveys?: Record<string, unknown> | Record<string, unknown>[] | null | undefined } | null)
      ?.site_surveys
  );
  const customer = pickSingle(
    (survey as { customers?: Record<string, unknown> | Record<string, unknown>[] | null | undefined } | null)
      ?.customers
  );
  const customerUser = pickSingle(
    (customer as { users?: Record<string, unknown> | Record<string, unknown>[] | null | undefined } | null)?.users
  );

  const customerId = safeText((customerUser as { id?: unknown } | null)?.id);
  const amountTotal = safeNumber((budget as { total?: unknown } | null)?.total);
  const currency = "USD";

  if (!companyId || !budgetId) {
    throw new Error("El proyecto no tiene la informacion necesaria para generar el pago.");
  }
  if (!customerId) {
    throw new Error("No se pudo identificar el cliente del proyecto.");
  }
  if (amountTotal <= 0) {
    throw new Error("La cotizacion del proyecto no tiene un total valido.");
  }

  if (!ctx.isServiceRole) {
    await ensureCompanyAccess(ctx, companyId);
  }

  const { data: existing, error: existingError } = await ctx.adminClient
    .from("payment_accounts")
    .select(
      "id, company_id, customer_id, project_id, budget_id, status, currency, amount_total, amount_paid, amount_pending, invoice_number, invoice_pdf_path, invoice_issued_at"
    )
    .eq("project_id", projectId)
    .maybeSingle<{
      id: string;
      company_id: string;
      customer_id: string;
      project_id: string;
      budget_id: string;
      status: string;
      currency: string | null;
      amount_total: number;
      amount_paid: number;
      amount_pending: number;
      invoice_number: string | null;
      invoice_pdf_path: string | null;
      invoice_issued_at: string | null;
    }>();

  if (existingError) {
    throw new Error(existingError.message || "No se pudo validar la cuenta de pago.");
  }

  const nowIso = new Date().toISOString();
  let currentAccount = existing
    ? {
        id: existing.id,
        invoicePdfPath: existing.invoice_pdf_path,
        invoiceIssuedAt: existing.invoice_issued_at,
      }
    : null;
  let accountId = currentAccount?.id ?? crypto.randomUUID();
  let created = false;
  let amountChanged = false;
  let invoiceNumber = existing?.invoice_number ?? "";
  let invoiceError: string | null = null;

  if (existing) {
    const currentCurrency = safeText(existing.currency, currency);
    amountChanged =
      Math.abs(safeNumber(existing.amount_total, 0) - amountTotal) > 0.0001 ||
      currentCurrency !== currency ||
      safeText(existing.customer_id) !== customerId ||
      safeText(existing.budget_id) !== budgetId;

    if (!invoiceNumber) {
      invoiceNumber = buildDocumentNumber("FAC", existing.id);
    }

    const patch: Record<string, unknown> = {
      company_id: companyId,
      customer_id: customerId,
      project_id: projectId,
      budget_id: budgetId,
      currency,
      amount_total: amountTotal,
      amount_paid: safeNumber(existing.amount_paid, 0),
      amount_pending: Math.max(0, amountTotal - safeNumber(existing.amount_paid, 0)),
      invoice_number: invoiceNumber,
      updated_at: nowIso,
    };

    if (amountChanged) {
      patch.invoice_pdf_path = null;
      patch.invoice_issued_at = null;
    }

    const { error: updateError } = await ctx.adminClient
      .from("payment_accounts")
      .update(patch)
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(updateError.message || "No se pudo actualizar la cuenta de pago.");
    }
  } else {
    created = true;
    invoiceNumber = buildDocumentNumber("FAC", accountId);

    const { error: insertError } = await ctx.adminClient.from("payment_accounts").insert({
      id: accountId,
      company_id: companyId,
      customer_id: customerId,
      project_id: projectId,
      budget_id: budgetId,
      status: "pending",
      currency,
      amount_total: amountTotal,
      amount_paid: 0,
      amount_pending: amountTotal,
      invoice_number: invoiceNumber,
      created_at: nowIso,
      updated_at: nowIso,
    });

    if (insertError) {
      const isDuplicateProject =
        safeText((insertError as { code?: unknown }).code) === "23505" &&
        safeText((insertError as { message?: unknown }).message).includes("payment_accounts_project_uidx");

      if (!isDuplicateProject) {
        throw new Error(insertError.message || "No se pudo crear la cuenta de pago.");
      }

      const { data: duplicated, error: duplicatedError } = await ctx.adminClient
        .from("payment_accounts")
        .select(
          "id, invoice_number, invoice_pdf_path, invoice_issued_at, amount_total, amount_paid, amount_pending, customer_id, budget_id, currency"
        )
        .eq("project_id", projectId)
        .maybeSingle<{
          id: string;
          invoice_number: string | null;
          invoice_pdf_path: string | null;
          invoice_issued_at: string | null;
          amount_total: number;
          amount_paid: number;
          amount_pending: number;
          customer_id: string;
          budget_id: string;
          currency: string | null;
        }>();

      if (duplicatedError || !duplicated?.id) {
        throw new Error(duplicatedError?.message || insertError.message || "No se pudo recuperar la cuenta de pago.");
      }

      accountId = duplicated.id;
      currentAccount = {
        id: duplicated.id,
        invoicePdfPath: duplicated.invoice_pdf_path,
        invoiceIssuedAt: duplicated.invoice_issued_at,
      };
      created = false;
      invoiceNumber = safeText(duplicated.invoice_number, buildDocumentNumber("FAC", duplicated.id));
      amountChanged =
        Math.abs(safeNumber(duplicated.amount_total, 0) - amountTotal) > 0.0001 ||
        safeText(duplicated.currency, currency) !== currency ||
        safeText(duplicated.customer_id) !== customerId ||
        safeText(duplicated.budget_id) !== budgetId;
    }
  }

  const shouldIssueInvoice =
    created || amountChanged || !(currentAccount?.invoicePdfPath ?? null) || !(currentAccount?.invoiceIssuedAt ?? null);

  let pdfUrl: string | null = null;
  let invoiceIssued = false;

  if (shouldIssueInvoice) {
    try {
      const invoiceResult = await issueAccountInvoice(ctx, {
        accountId,
        force: true,
      });
      pdfUrl = safeNullableText(invoiceResult.pdfUrl);
      invoiceIssued = true;
    } catch (error) {
      invoiceError = error instanceof Error ? error.message : String(error);
      console.error("[payments_actions] ensure_project_payment_account invoice_issue_error", {
        projectId,
        accountId,
        message: invoiceError,
      });
    }
  }

  await insertAuditLog(ctx, {
    action: created ? "create" : "update",
    entity: "payment_account",
    entityId: accountId,
    companyId,
    newValues: {
      projectId,
      budgetId,
      amountTotal,
      currency,
      created,
      amountChanged,
      invoiceIssued,
      invoiceError,
    },
  });

  return {
    accountId,
    invoiceNumber,
    amountTotal,
    currency,
    created,
    amountChanged,
    invoiceIssued,
    pdfUrl,
    invoiceError,
  };
}

async function submitTransferPayment(ctx: AuthContext, payload: Record<string, unknown>) {
  const accountId = safeText(payload.accountId);
  const reference = safeText(payload.reference);
  const notes = safeText(payload.notes);
  const proofBase64 = safeText(payload.proofBase64);
  const proofFilename = safeText(payload.proofFilename, "comprobante.png");
  const proofContentType = safeText(payload.proofContentType, "image/png");

  if (!accountId || !proofBase64) {
    throw new Error("accountId y proofBase64 son requeridos.");
  }

  const account = await ensureCustomerAccountAccess(ctx, accountId);
  if (account.status === "paid") throw new Error("La cuenta ya fue saldada.");

  const bytes = decodeBase64(proofBase64);
  const extension = extensionFromFilename(proofFilename, proofContentType.includes("pdf") ? "pdf" : "png");
  const filePath = `${account.companyId}/${account.customerId}/${account.id}/proofs/comprobante-${Date.now()}.${extension}`;
  await uploadBytes(ctx.adminClient, filePath, bytes, proofContentType);

  const nowIso = new Date().toISOString();
  const { data, error } = await ctx.adminClient
    .from("payment_transactions")
    .insert({
      payment_account_id: account.id,
      company_id: account.companyId,
      customer_id: account.customerId,
      method: "bank_transfer",
      status: "submitted",
      amount: SUBMITTED_TRANSFER_PLACEHOLDER_AMOUNT,
      reference: reference || null,
      notes: notes || null,
      proof_file_path: filePath,
      submitted_by: ctx.authUser?.id ?? account.customerId,
      submitted_at: nowIso,
      updated_at: nowIso,
    })
    .select("id")
    .maybeSingle();

  if (error || !data?.id) {
    throw new Error(error?.message || "No se pudo registrar la transferencia.");
  }

  await insertAuditLog(ctx, {
    action: "create",
    entity: "payment_transaction",
    entityId: safeText(data.id),
    companyId: account.companyId,
    newValues: {
      method: "bank_transfer",
      amount: null,
      reference: reference || null,
      proofFilePath: filePath,
      status: "submitted",
    },
  });

  return {
    transactionId: safeText(data.id),
    proofPath: filePath,
  };
}

async function createReceiptForTransaction(ctx: AuthContext, transactionId: string) {
  const transaction = await fetchPaymentTransactionContext(ctx.adminClient, transactionId);
  if (!transaction) throw new Error("No se encontro la transaccion.");
  if (transaction.amount === null) throw new Error("La transaccion aprobada no tiene monto asignado.");

  const account = await fetchPaymentAccountContext(ctx.adminClient, transaction.accountId);
  if (!account) throw new Error("No se encontro la cuenta de la transaccion.");

  const receiptNumber = transaction.receiptNumber ?? buildDocumentNumber("REC", transaction.id);
  const pdfBytes = await buildReceiptPdf(account, {
    ...transaction,
    receiptNumber,
  });

  const filePath = `${account.companyId}/${account.customerId}/${account.id}/receipts/recibo-${sanitizeFilename(receiptNumber)}.pdf`;
  await uploadBytes(ctx.adminClient, filePath, pdfBytes, "application/pdf");

  const nowIso = new Date().toISOString();
  const { error } = await ctx.adminClient
    .from("payment_transactions")
    .update({
      receipt_number: receiptNumber,
      receipt_pdf_path: filePath,
      receipt_emailed_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", transaction.id);

  if (error) throw new Error(error.message || "No se pudo guardar el recibo.");

  await insertAuditLog(ctx, {
    action: "create",
    entity: "payment_receipt",
    entityId: transaction.id,
    companyId: account.companyId,
    newValues: {
      receiptNumber,
      receiptPdfPath: filePath,
    },
  });

  const customerEmail = await fetchCustomerEmail(ctx.adminClient, account.customerId);
  const pdfUrl = await createSignedUrl(ctx.adminClient, filePath);
  if (customerEmail) {
    await sendEmailSafely(ctx, {
      companyId: account.companyId,
      to: customerEmail,
      type: "transaction",
      eventKey: "payment.approved",
      templateKey: "payment_receipt",
      entityType: "payment_transaction",
      entityId: transaction.id,
      subject: `Factura de pago ${receiptNumber}`,
      title: "Pago aplicado correctamente",
      message: `Registramos tu pago por ${formatCurrency(transaction.amount, account.currency)}. Adjuntamos el documento ${receiptNumber}.`,
      actionUrl: pdfUrl ?? undefined,
      metadata: {
        receiptNumber,
        invoiceNumber: account.invoiceNumber,
        amount: transaction.amount,
        amountPending: account.amountPending,
        method: paymentMethodLabel(transaction.method),
      },
      attachments: [
        {
          filename: `factura-pago-${receiptNumber}.pdf`,
          contentBase64: bytesToBase64(pdfBytes),
          contentType: "application/pdf",
        },
      ],
    }, "No se pudo enviar el recibo por correo.");
  }

  return {
    receiptNumber,
    receiptPdfPath: filePath,
    pdfUrl,
  };
}

async function recordManualPayment(ctx: AuthContext, payload: Record<string, unknown>) {
  const accountId = safeText(payload.accountId);
  const amount = safeNumber(payload.amount);
  const reference = safeText(payload.reference);
  const notes = safeText(payload.notes);

  if (!accountId || !amount) throw new Error("accountId y amount son requeridos.");
  if (amount <= 0) throw new Error("El monto debe ser mayor que cero.");

  const account = await fetchPaymentAccountContext(ctx.adminClient, accountId);
  if (!account) throw new Error("No se encontro la cuenta.");
  await ensureCompanyAccess(ctx, account.companyId);

  if (account.status === "paid") throw new Error("La cuenta ya esta saldada.");
  if (amount > account.amountPending) throw new Error("El monto no puede superar el pendiente actual.");

  const nowIso = new Date().toISOString();
  const { data, error } = await ctx.adminClient
    .from("payment_transactions")
    .insert({
      payment_account_id: account.id,
      company_id: account.companyId,
      customer_id: account.customerId,
      method: "cash",
      status: "approved",
      amount,
      reference: reference || null,
      notes: notes || null,
      submitted_by: ctx.authUser?.id ?? null,
      reviewed_by: ctx.authUser?.id ?? null,
      submitted_at: nowIso,
      reviewed_at: nowIso,
      approved_at: nowIso,
      updated_at: nowIso,
    })
    .select("id")
    .maybeSingle();

  if (error || !data?.id) {
    throw new Error(error?.message || "No se pudo registrar el pago manual.");
  }

  await insertAuditLog(ctx, {
    action: "create",
    entity: "payment_transaction",
    entityId: safeText(data.id),
    companyId: account.companyId,
    newValues: {
      method: "cash",
      amount,
      reference,
      status: "approved",
    },
  });

  const receipt = await createReceiptForTransaction(ctx, safeText(data.id));
  const updatedAccount = await fetchPaymentAccountContext(ctx.adminClient, account.id);

  return {
    transactionId: safeText(data.id),
    accountStatus: updatedAccount?.status ?? account.status,
    amountPending: updatedAccount?.amountPending ?? account.amountPending,
    receipt,
  };
}

async function reviewPaymentTransaction(ctx: AuthContext, payload: Record<string, unknown>) {
  const transactionId = safeText(payload.transactionId);
  const approved = Boolean(payload.approved);
  const approvedAmount = safeNumber(payload.approvedAmount);
  const reviewNotes = safeText(payload.reviewNotes);
  if (!transactionId) throw new Error("transactionId es requerido.");

  const transaction = await fetchPaymentTransactionContext(ctx.adminClient, transactionId);
  if (!transaction) throw new Error("No se encontro la transaccion.");
  const account = await fetchPaymentAccountContext(ctx.adminClient, transaction.accountId);
  if (!account) throw new Error("No se encontro la cuenta relacionada.");
  await ensureCompanyAccess(ctx, account.companyId);

  if (transaction.status !== "submitted") {
    throw new Error("La transaccion ya fue revisada.");
  }
  if (approved && approvedAmount <= 0) {
    throw new Error("Debes indicar un monto valido para aprobar la solicitud.");
  }
  if (approved && approvedAmount > account.amountPending) {
    throw new Error("El monto aprobado no puede superar el pendiente actual.");
  }

  const nowIso = new Date().toISOString();
  const patch = approved
    ? {
        status: "approved",
        amount: approvedAmount,
        reviewed_by: ctx.authUser?.id ?? null,
        review_notes: reviewNotes || null,
        reviewed_at: nowIso,
        approved_at: nowIso,
        updated_at: nowIso,
      }
    : {
        status: "rejected",
        reviewed_by: ctx.authUser?.id ?? null,
        review_notes: reviewNotes || null,
        reviewed_at: nowIso,
        rejected_at: nowIso,
        updated_at: nowIso,
      };

  const { error } = await ctx.adminClient
    .from("payment_transactions")
    .update(patch)
    .eq("id", transaction.id);

  if (error) throw new Error(error.message || "No se pudo revisar la transaccion.");

  await insertAuditLog(ctx, {
    action: approved ? "update" : "reject",
    entity: "payment_transaction",
    entityId: transaction.id,
    companyId: account.companyId,
    oldValues: {
      status: transaction.status,
    },
    newValues: {
      status: approved ? "approved" : "rejected",
      amount: approved ? approvedAmount : transaction.amount,
      reviewNotes: reviewNotes || null,
    },
  });

  let receipt: Record<string, unknown> | null = null;
  if (approved) {
    receipt = await createReceiptForTransaction(ctx, transaction.id);
  } else {
    const customerEmail = await fetchCustomerEmail(ctx.adminClient, account.customerId);
    if (customerEmail) {
      await sendEmailSafely(ctx, {
        companyId: account.companyId,
        to: customerEmail,
        type: "transaction",
        eventKey: "payment.rejected",
        templateKey: "payment_rejected",
        entityType: "payment_transaction",
        entityId: transaction.id,
        subject: `Pago rechazado ${transaction.reference ?? transaction.id.slice(0, 8)}`,
        title: "No pudimos validar tu pago",
        message: reviewNotes
          ? `Tu comprobante fue rechazado. Motivo: ${reviewNotes}`
          : "Tu comprobante fue rechazado. Revisa el detalle y vuelve a intentarlo.",
        metadata: {
          reference: transaction.reference,
          amount: transaction.amount,
          reason: reviewNotes || null,
        },
      }, "No se pudo enviar el correo de rechazo.");
    }
  }

  const updatedAccount = await fetchPaymentAccountContext(ctx.adminClient, account.id);
  return {
    transactionId: transaction.id,
    status: approved ? "approved" : "rejected",
    accountStatus: updatedAccount?.status ?? account.status,
    amountPending: updatedAccount?.amountPending ?? account.amountPending,
    receipt,
  };
}

async function generateStatement(ctx: AuthContext, payload: Record<string, unknown>) {
  const accountId = safeText(payload.accountId);
  if (!accountId) throw new Error("accountId es requerido.");

  const account = await fetchPaymentAccountContext(ctx.adminClient, accountId);
  if (!account) throw new Error("No se encontro la cuenta.");

  if (ctx.isServiceRole) {
    // allowed
  } else if (ctx.authUser?.id === account.customerId) {
    // allowed
  } else {
    await ensureCompanyAccess(ctx, account.companyId);
  }

  const transactions = await fetchPaymentTransactionsByAccount(ctx.adminClient, account.id);
  const pdfBytes = await buildStatementPdf(account, transactions);
  const filePath = `${account.companyId}/${account.customerId}/${account.id}/statements/estado-${Date.now()}.pdf`;
  await uploadBytes(ctx.adminClient, filePath, pdfBytes, "application/pdf");

  await insertAuditLog(ctx, {
    action: "create",
    entity: "payment_statement",
    entityId: account.id,
    companyId: account.companyId,
    newValues: {
      filePath,
      transactions: transactions.length,
    },
  });

  return {
    accountId: account.id,
    pdfPath: filePath,
    pdfUrl: await createSignedUrl(ctx.adminClient, filePath),
  };
}

async function sendDailyReminders(ctx: AuthContext) {
  if (!ctx.isServiceRole) {
    throw new Error("Solo service role puede ejecutar recordatorios.");
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await ctx.adminClient
    .from("payment_accounts")
    .select("id")
    .in("status", ["pending", "partial"])
    .eq("reminder_enabled", true)
    .or(`last_reminded_at.is.null,last_reminded_at.lt.${today}T00:00:00.000Z`)
    .limit(100);

  if (error) throw new Error(error.message || "No se pudieron cargar cuentas pendientes.");

  let sent = 0;
  const errors: string[] = [];

  for (const row of data ?? []) {
    try {
      const account = await fetchPaymentAccountContext(ctx.adminClient, safeText(row.id));
      if (!account) continue;

      const { data: existingLog } = await ctx.adminClient
        .from("payment_reminder_logs")
        .select("id")
        .eq("payment_account_id", account.id)
        .eq("reminder_date", today)
        .maybeSingle();

      if (existingLog?.id) continue;

      const email = await fetchCustomerEmail(ctx.adminClient, account.customerId);
      if (!email) continue;

      const actionUrl = account.invoicePdfPath ? await createSignedUrl(ctx.adminClient, account.invoicePdfPath) : null;
      await sendEmail(ctx, {
        companyId: account.companyId,
        to: email,
        type: "transaction",
        eventKey: "payment.reminder.daily",
        templateKey: "payment_reminder_daily",
        entityType: "payment_account",
        entityId: account.id,
        subject: `Recordatorio de pago ${account.invoiceNumber}`,
        title: "Tienes un pago pendiente",
        message: `Tu factura ${account.invoiceNumber} mantiene un saldo pendiente de ${formatCurrency(account.amountPending, account.currency)}.`,
        actionUrl: actionUrl ?? undefined,
        metadata: {
          invoiceNumber: account.invoiceNumber,
          amountPending: account.amountPending,
          amountTotal: account.amountTotal,
          siteName: account.siteName,
        },
      });

      await ctx.adminClient.from("payment_reminder_logs").insert({
        payment_account_id: account.id,
        company_id: account.companyId,
        reminder_date: today,
      });

      await ctx.adminClient
        .from("payment_accounts")
        .update({ last_reminded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", account.id);

      sent += 1;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return { sent, errors };
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return jsonResponse(405, { error: "Method not allowed" });
    }

    const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const mode = safeText(payload.mode) as Mode;

    if (!mode) {
      return jsonResponse(400, { error: "mode es requerido." });
    }

    const ctx = await buildAuthContext(req, mode === "send_daily_reminders");

    if (mode === "issue_account_invoice") {
      const result = await issueAccountInvoice(ctx, payload);
      return jsonResponse(200, result);
    }

    if (mode === "ensure_project_payment_account") {
      const result = await ensureProjectPaymentAccount(ctx, payload);
      return jsonResponse(200, result);
    }

    if (mode === "submit_transfer_payment") {
      const result = await submitTransferPayment(ctx, payload);
      return jsonResponse(200, result);
    }

    if (mode === "record_manual_payment") {
      const result = await recordManualPayment(ctx, payload);
      return jsonResponse(200, result);
    }

    if (mode === "review_payment_transaction") {
      const result = await reviewPaymentTransaction(ctx, payload);
      return jsonResponse(200, result);
    }

    if (mode === "generate_statement") {
      const result = await generateStatement(ctx, payload);
      return jsonResponse(200, result);
    }

    if (mode === "send_daily_reminders") {
      const result = await sendDailyReminders(ctx);
      return jsonResponse(200, result);
    }

    return jsonResponse(400, { error: "mode invalido." });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[payments_actions] unhandled_error", { message });
    return jsonResponse(500, { error: message });
  }
});
