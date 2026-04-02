import { supabase } from "../libs/supabase";
import { logAuditEvent } from "./audit.service";
import { sendEmailNotification } from "./email-notification.service";
import { getSurveyExecutionData } from "./siteSurveyExecution.service";
import type { BudgetDetail, BudgetItem, BudgetStatus, BudgetSummary } from "../types/budget.types";
import type { SurveyLayout } from "../types/siteSurveyExecution.types";

function safeText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function safeNullableText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return safeText(value, "");
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

function normalizeLayout(value: unknown): SurveyLayout {
  if (value && typeof value === "object") {
    return value as SurveyLayout;
  }
  return { walls: [], zones: [], devices: [] };
}

function isValidEmail(value: string | null | undefined): value is string {
  if (!value) return false;
  const normalized = value.trim();
  return normalized.length > 3 && normalized.includes("@");
}

async function getBudgetNotificationContext(
  budgetId: string
): Promise<{ companyId: string; customerId: string; customerEmail: string | null; customerName: string | null } | null> {
  const { data: budgetData, error: budgetError } = await supabase
    .from("budgets")
    .select("id, company_id, site_surveys:survey_id ( customer_id )")
    .eq("id", budgetId)
    .maybeSingle();

  if (budgetError || !budgetData) return null;

  const surveyRow = pickSingle(budgetData.site_surveys as unknown);
  const customerId = safeNullableText((surveyRow as { customer_id?: unknown } | null)?.customer_id);
  if (!customerId) return null;

  const { data: customerData } = await supabase
    .from("users")
    .select("name, email")
    .eq("id", customerId)
    .maybeSingle<{ name: string | null; email: string | null }>();

  return {
    companyId: safeText(budgetData.company_id),
    customerId,
    customerEmail: customerData?.email ?? null,
    customerName: customerData?.name ?? null,
  };
}

async function notifyBudgetDecision(input: {
  budgetId: string;
  decision: "aprobar" | "rechazar";
  method: "internal" | "portal";
}): Promise<void> {
  const context = await getBudgetNotificationContext(input.budgetId);
  if (!context || !isValidEmail(context.customerEmail)) return;

  const approved = input.decision === "aprobar";
  const eventKey = approved ? "quote.approved" : "quote.rejected";

  void sendEmailNotification({
    companyId: context.companyId,
    to: context.customerEmail,
    type: "transaction",
    eventKey,
    templateKey: "quote_decision",
    entityType: "budget",
    entityId: input.budgetId,
    title: approved ? "Cotizacion aprobada" : "Cotizacion rechazada",
    message: approved
      ? `Hola ${context.customerName ?? "cliente"}, tu cotizacion fue aprobada correctamente.`
      : `Hola ${context.customerName ?? "cliente"}, tu cotizacion fue rechazada.`,
    metadata: {
      budgetId: input.budgetId,
      decision: input.decision,
      status: approved ? "aprobada" : "rechazada",
      method: input.method,
    },
  }).catch((notifyError) => {
    console.error("[budget.service] budget_decision_email_error", notifyError);
  });
}

export async function listBudgets(companyId: string): Promise<BudgetSummary[]> {
  const { data, error } = await supabase
    .from("budgets")
    .select(
      `
      id,
      company_id,
      survey_id,
      status,
      created_at,
      updated_at,
      subtotal,
      tax_rate,
      tax_amount,
      total,
      sent_at,
      approved_at,
      rejected_at,
      expires_at,
      budget_quotes ( status ),
      site_surveys:survey_id (
        id,
        site_id,
        customer_id,
        customer_sites:site_id ( id, name ),
        customers:customer_id ( user_id, users:users!customers_user_id_fkey ( id, name ) )
      )
    `
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "No se pudieron cargar los presupuestos.");
  }

  return (data ?? []).map((row) => {
    const surveyRow = pickSingle(row.site_surveys as unknown);
    const siteRow = pickSingle((surveyRow as any)?.customer_sites as unknown);
    const customerRow = pickSingle((surveyRow as any)?.customers as unknown);
    const customerUser = pickSingle((customerRow as any)?.users as unknown);

    const quoteRow = pickSingle(row.budget_quotes as unknown);

    return {
      id: safeText(row.id),
      companyId: safeText(row.company_id),
      surveyId: safeText(row.survey_id),
      status: (safeText(row.status, "borrador").toLowerCase() as BudgetStatus) ?? "borrador",
      createdAt: safeText(row.created_at ?? new Date().toISOString()),
      updatedAt: safeText(row.updated_at ?? new Date().toISOString()),
      customerName: safeNullableText((customerUser as any)?.name),
      siteName: safeNullableText((siteRow as any)?.name),
      subtotal: safeNumber(row.subtotal, 0),
      taxRate: safeNumber(row.tax_rate, 0),
      taxAmount: safeNumber(row.tax_amount, 0),
      total: safeNumber(row.total, 0),
      sentAt: safeNullableText(row.sent_at),
      approvedAt: safeNullableText(row.approved_at),
      rejectedAt: safeNullableText(row.rejected_at),
      expiresAt: safeNullableText(row.expires_at),
      quoteStatus: safeNullableText((quoteRow as any)?.status) as BudgetSummary["quoteStatus"],
    } satisfies BudgetSummary;
  });
}

export async function listBudgetsForCustomer(companyId: string, customerId: string): Promise<BudgetSummary[]> {
  const { data, error } = await supabase
    .from("budgets")
    .select(
      `
      id,
      company_id,
      survey_id,
      status,
      created_at,
      updated_at,
      subtotal,
      tax_rate,
      tax_amount,
      total,
      sent_at,
      approved_at,
      rejected_at,
      expires_at,
      budget_quotes ( status ),
      site_surveys:survey_id (
        id,
        site_id,
        customer_id,
        customer_sites:site_id ( id, name ),
        customers:customer_id ( user_id, users:users!customers_user_id_fkey ( id, name ) )
      )
    `
    )
    .eq("company_id", companyId)
    .eq("site_surveys.customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "No se pudieron cargar las cotizaciones.");
  }

  return (data ?? []).map((row) => {
    const surveyRow = pickSingle(row.site_surveys as unknown);
    const siteRow = pickSingle((surveyRow as any)?.customer_sites as unknown);
    const customerRow = pickSingle((surveyRow as any)?.customers as unknown);
    const customerUser = pickSingle((customerRow as any)?.users as unknown);

    const quoteRow = pickSingle(row.budget_quotes as unknown);

    return {
      id: safeText(row.id),
      companyId: safeText(row.company_id),
      surveyId: safeText(row.survey_id),
      status: (safeText(row.status, "borrador").toLowerCase() as BudgetStatus) ?? "borrador",
      createdAt: safeText(row.created_at ?? new Date().toISOString()),
      updatedAt: safeText(row.updated_at ?? new Date().toISOString()),
      customerName: safeNullableText((customerUser as any)?.name),
      siteName: safeNullableText((siteRow as any)?.name),
      subtotal: safeNumber(row.subtotal, 0),
      taxRate: safeNumber(row.tax_rate, 0),
      taxAmount: safeNumber(row.tax_amount, 0),
      total: safeNumber(row.total, 0),
      sentAt: safeNullableText(row.sent_at),
      approvedAt: safeNullableText(row.approved_at),
      rejectedAt: safeNullableText(row.rejected_at),
      expiresAt: safeNullableText(row.expires_at),
      quoteStatus: safeNullableText((quoteRow as any)?.status) as BudgetSummary["quoteStatus"],
    } satisfies BudgetSummary;
  });
}

export async function createBudgetFromSurvey(input: {
  companyId: string;
  surveyId: string;
  createdBy: string | null;
  taxRate: number;
}): Promise<BudgetDetail> {
  const surveyData = await getSurveyExecutionData(input.surveyId, input.companyId);

  const devicePriceById = new Map(
    surveyData.catalogDevices.map((device) => [device.id, Number(device.price ?? 0)])
  );

  const grouped = new Map<string, { deviceId: string; zoneId: string | null; quantity: number }>();
  surveyData.survey.layout.devices.forEach((device) => {
    const key = `${device.deviceId}::${device.zoneId ?? "no-zone"}`;
    const current = grouped.get(key);
    if (current) {
      current.quantity += 1;
    } else {
      grouped.set(key, { deviceId: device.deviceId, zoneId: device.zoneId ?? null, quantity: 1 });
    }
  });

  const items: BudgetItem[] = Array.from(grouped.values()).map((row) => {
    const unitPrice = devicePriceById.get(row.deviceId) ?? 0;
    return {
      id: crypto.randomUUID(),
      budgetId: "",
      deviceId: row.deviceId,
      zoneId: row.zoneId,
      quantity: row.quantity,
      unitPrice,
      subtotal: unitPrice * row.quantity,
    };
  });

  const subtotal = items.reduce((acc, item) => acc + item.subtotal, 0);
  const taxAmount = subtotal * input.taxRate;
  const total = subtotal + taxAmount;

  const { data: budgetRow, error } = await supabase
    .from("budgets")
    .insert({
      company_id: input.companyId,
      survey_id: input.surveyId,
      status: "borrador",
      created_by: input.createdBy,
      layout_json: surveyData.survey.layout,
      subtotal,
      tax_rate: input.taxRate,
      tax_amount: taxAmount,
      total,
    })
    .select("id, created_at, updated_at, status, subtotal, tax_rate, tax_amount, total, sent_at, approved_at, rejected_at, expires_at")
    .single();

  if (error || !budgetRow) {
    throw new Error(error?.message || "No se pudo crear el presupuesto.");
  }

  const budgetId = safeText(budgetRow.id);
  const payload = items.map((item) => ({
    budget_id: budgetId,
    device_id: item.deviceId,
    zone_id: item.zoneId,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    subtotal: item.subtotal,
  }));

  if (payload.length > 0) {
    const { error: itemsError } = await supabase.from("budget_items").insert(payload);
    if (itemsError) {
      throw new Error(itemsError.message || "No se pudieron guardar los items del presupuesto.");
    }
  }

  await logAuditEvent({
    action: "create",
    entity: "budgets",
    entityId: budgetId,
    companyId: input.companyId,
    newValues: {
      surveyId: input.surveyId,
      status: "borrador",
      subtotal,
      taxRate: input.taxRate,
      taxAmount,
      total,
      items: payload.length,
    },
  });

  return {
    id: budgetId,
    companyId: input.companyId,
    surveyId: input.surveyId,
    status: "borrador",
    createdAt: safeText(budgetRow.created_at ?? new Date().toISOString()),
    updatedAt: safeText(budgetRow.updated_at ?? new Date().toISOString()),
    customerName: surveyData.survey.customerName ?? null,
    siteName: surveyData.survey.siteName ?? null,
    subtotal,
    taxRate: input.taxRate,
    taxAmount,
    total,
    sentAt: safeNullableText(budgetRow.sent_at),
    approvedAt: safeNullableText(budgetRow.approved_at),
    rejectedAt: safeNullableText(budgetRow.rejected_at),
    expiresAt: safeNullableText(budgetRow.expires_at),
    layout: surveyData.survey.layout,
    items: items.map((item) => ({ ...item, budgetId })),
    approvalMethod: null,
    approvalNotes: null,
    approvedByUserId: null,
  } satisfies BudgetDetail;
}

export async function getBudgetDetail(budgetId: string, companyId: string): Promise<BudgetDetail> {
  const { data, error } = await supabase
    .from("budgets")
    .select(
      `
      id,
      company_id,
      survey_id,
      status,
      created_at,
      updated_at,
      subtotal,
      tax_rate,
      tax_amount,
      total,
      sent_at,
      approved_at,
      rejected_at,
      expires_at,
      approval_method,
      approval_notes,
      approved_by_user_id,
      layout_json,
      budget_quotes ( status, quote_number, sent_at, valid_until, pdf_path ),
      site_surveys:survey_id (
        id,
        site_id,
        customer_id,
        customer_sites:site_id ( id, name ),
        customers:customer_id ( user_id, users:users!customers_user_id_fkey ( id, name ) )
      ),
      budget_items (
        id,
        device_id,
        zone_id,
        quantity,
        unit_price,
        subtotal,
        devices:device_id ( id, name, model ),
        zones:zone_id ( id, name )
      )
    `
    )
    .eq("id", budgetId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "No se pudo cargar el presupuesto.");
  }

  if (!data) {
    throw new Error("No se encontro el presupuesto solicitado.");
  }

  const surveyRow = pickSingle(data.site_surveys as unknown);
  const siteRow = pickSingle((surveyRow as any)?.customer_sites as unknown);
  const customerRow = pickSingle((surveyRow as any)?.customers as unknown);
  const customerUser = pickSingle((customerRow as any)?.users as unknown);

  const items = (data.budget_items as any[] | null | undefined) ?? [];
  const quoteRow = pickSingle(data.budget_quotes as unknown);

  return {
    id: safeText(data.id),
    companyId: safeText(data.company_id),
    surveyId: safeText(data.survey_id),
    status: (safeText(data.status, "borrador").toLowerCase() as BudgetStatus) ?? "borrador",
    createdAt: safeText(data.created_at ?? new Date().toISOString()),
    updatedAt: safeText(data.updated_at ?? new Date().toISOString()),
    customerName: safeNullableText((customerUser as any)?.name),
    siteName: safeNullableText((siteRow as any)?.name),
    subtotal: safeNumber(data.subtotal, 0),
    taxRate: safeNumber(data.tax_rate, 0),
    taxAmount: safeNumber(data.tax_amount, 0),
    total: safeNumber(data.total, 0),
    sentAt: safeNullableText(data.sent_at),
    approvedAt: safeNullableText(data.approved_at),
    rejectedAt: safeNullableText(data.rejected_at),
    expiresAt: safeNullableText(data.expires_at),
    layout: normalizeLayout(data.layout_json),
    items: items.map((row) => {
      const deviceRow = pickSingle(row.devices as unknown);
      const zoneRow = pickSingle(row.zones as unknown);

      return {
      id: safeText(row.id),
      budgetId: safeText(data.id),
      deviceId: safeText(row.device_id),
      zoneId: safeNullableText(row.zone_id),
      deviceName: safeNullableText((deviceRow as any)?.name),
      deviceModel: safeNullableText((deviceRow as any)?.model),
      zoneName: safeNullableText((zoneRow as any)?.name),
      quantity: safeNumber(row.quantity, 0),
      unitPrice: safeNumber(row.unit_price, 0),
      subtotal: safeNumber(row.subtotal, 0),
      };
    }),
    approvalMethod: (safeNullableText(data.approval_method) as BudgetDetail["approvalMethod"]) ?? null,
    approvalNotes: safeNullableText(data.approval_notes),
    approvedByUserId: safeNullableText(data.approved_by_user_id),
    quoteStatus: safeNullableText((quoteRow as any)?.status) as BudgetDetail["quoteStatus"],
    quoteNumber: safeNullableText((quoteRow as any)?.quote_number),
    quoteSentAt: safeNullableText((quoteRow as any)?.sent_at),
    quoteValidUntil: safeNullableText((quoteRow as any)?.valid_until),
    quotePdfPath: safeNullableText((quoteRow as any)?.pdf_path),
  } satisfies BudgetDetail;
}

export async function getBudgetDetailForCustomer(
  budgetId: string,
  companyId: string,
  customerId: string
): Promise<BudgetDetail> {
  const { data, error } = await supabase
    .from("budgets")
    .select(
      `
      id,
      company_id,
      survey_id,
      status,
      created_at,
      updated_at,
      subtotal,
      tax_rate,
      tax_amount,
      total,
      sent_at,
      approved_at,
      rejected_at,
      expires_at,
      approval_method,
      approval_notes,
      approved_by_user_id,
      layout_json,
      budget_quotes ( status, quote_number, sent_at, valid_until, pdf_path ),
      site_surveys:survey_id (
        id,
        site_id,
        customer_id,
        customer_sites:site_id ( id, name ),
        customers:customer_id ( user_id, users:users!customers_user_id_fkey ( id, name ) )
      ),
      budget_items (
        id,
        device_id,
        zone_id,
        quantity,
        unit_price,
        subtotal,
        devices:device_id ( id, name, model ),
        zones:zone_id ( id, name )
      )
    `
    )
    .eq("id", budgetId)
    .eq("company_id", companyId)
    .eq("site_surveys.customer_id", customerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "No se pudo cargar la cotizacion.");
  }

  if (!data) {
    throw new Error("No se encontro la cotizacion solicitada.");
  }

  const surveyRow = pickSingle(data.site_surveys as unknown);
  const siteRow = pickSingle((surveyRow as any)?.customer_sites as unknown);
  const customerRow = pickSingle((surveyRow as any)?.customers as unknown);
  const customerUser = pickSingle((customerRow as any)?.users as unknown);

  const items = (data.budget_items as any[] | null | undefined) ?? [];
  const quoteRow = pickSingle(data.budget_quotes as unknown);

  return {
    id: safeText(data.id),
    companyId: safeText(data.company_id),
    surveyId: safeText(data.survey_id),
    status: (safeText(data.status, "borrador").toLowerCase() as BudgetStatus) ?? "borrador",
    createdAt: safeText(data.created_at ?? new Date().toISOString()),
    updatedAt: safeText(data.updated_at ?? new Date().toISOString()),
    customerName: safeNullableText((customerUser as any)?.name),
    siteName: safeNullableText((siteRow as any)?.name),
    subtotal: safeNumber(data.subtotal, 0),
    taxRate: safeNumber(data.tax_rate, 0),
    taxAmount: safeNumber(data.tax_amount, 0),
    total: safeNumber(data.total, 0),
    sentAt: safeNullableText(data.sent_at),
    approvedAt: safeNullableText(data.approved_at),
    rejectedAt: safeNullableText(data.rejected_at),
    expiresAt: safeNullableText(data.expires_at),
    layout: normalizeLayout(data.layout_json),
    items: items.map((row) => {
      const deviceRow = pickSingle(row.devices as unknown);
      const zoneRow = pickSingle(row.zones as unknown);

      return {
      id: safeText(row.id),
      budgetId: safeText(data.id),
      deviceId: safeText(row.device_id),
      zoneId: safeNullableText(row.zone_id),
      deviceName: safeNullableText((deviceRow as any)?.name),
      deviceModel: safeNullableText((deviceRow as any)?.model),
      zoneName: safeNullableText((zoneRow as any)?.name),
      quantity: safeNumber(row.quantity, 0),
      unitPrice: safeNumber(row.unit_price, 0),
      subtotal: safeNumber(row.subtotal, 0),
      };
    }),
    approvalMethod: (safeNullableText(data.approval_method) as BudgetDetail["approvalMethod"]) ?? null,
    approvalNotes: safeNullableText(data.approval_notes),
    approvedByUserId: safeNullableText(data.approved_by_user_id),
    quoteStatus: safeNullableText((quoteRow as any)?.status) as BudgetDetail["quoteStatus"],
    quoteNumber: safeNullableText((quoteRow as any)?.quote_number),
    quoteSentAt: safeNullableText((quoteRow as any)?.sent_at),
    quoteValidUntil: safeNullableText((quoteRow as any)?.valid_until),
    quotePdfPath: safeNullableText((quoteRow as any)?.pdf_path),
  } satisfies BudgetDetail;
}

async function ensureBudgetNotExpired(budgetId: string): Promise<void> {
  const { data, error } = await supabase
    .from("budgets")
    .select("id, status, expires_at")
    .eq("id", budgetId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "No se pudo validar el vencimiento de la cotizacion.");
  }

  if (!data?.expires_at) return;

  const expired = new Date(data.expires_at).getTime() <= Date.now();
  if (!expired) return;

  if (safeText(data.status, "").toLowerCase() !== "expirada") {
    await supabase
      .from("budgets")
      .update({ status: "expirada", updated_at: new Date().toISOString() })
      .eq("id", budgetId);
  }

  throw new Error("La cotizacion esta expirada.");
}

async function ensureBudgetCanBeDecided(budgetId: string): Promise<void> {
  const { data, error } = await supabase
    .from("budgets")
    .select("id, status")
    .eq("id", budgetId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "No se pudo validar el estado de la cotizacion.");
  }

  const status = safeText(data?.status, "").toLowerCase();
  if (status !== "enviada") {
    throw new Error("Solo se puede aprobar o rechazar una cotizacion enviada.");
  }
}

export async function saveBudgetDraft(input: {
  budgetId: string;
  layout: SurveyLayout;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}): Promise<void> {
  const { error } = await supabase
    .from("budgets")
    .update({
      layout_json: input.layout,
      subtotal: input.subtotal,
      tax_rate: input.taxRate,
      tax_amount: input.taxAmount,
      total: input.total,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.budgetId);

  if (error) {
    throw new Error(error.message || "No se pudo guardar el presupuesto.");
  }

  await logAuditEvent({
    action: "update",
    entity: "budgets",
    entityId: input.budgetId,
    newValues: {
      subtotal: input.subtotal,
      taxRate: input.taxRate,
      taxAmount: input.taxAmount,
      total: input.total,
    },
  });
}

export async function replaceBudgetItems(budgetId: string, items: Array<{
  deviceId: string;
  zoneId: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}>): Promise<void> {
  const { error: deleteError } = await supabase.from("budget_items").delete().eq("budget_id", budgetId);
  if (deleteError) {
    throw new Error(deleteError.message || "No se pudieron limpiar los items del presupuesto.");
  }

  if (items.length === 0) return;

  const payload = items.map((item) => ({
    budget_id: budgetId,
    device_id: item.deviceId,
    zone_id: item.zoneId,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    subtotal: item.subtotal,
  }));

  const { error } = await supabase.from("budget_items").insert(payload);
  if (error) {
    throw new Error(error.message || "No se pudieron guardar los items del presupuesto.");
  }

  await logAuditEvent({
    action: "replace",
    entity: "budget_items",
    entityId: budgetId,
    newValues: { count: items.length },
  });
}

export async function approveBudgetInternal(input: {
  budgetId: string;
  approvedByUserId: string;
  notes: string | null;
  decision: "aprobar" | "rechazar";
}): Promise<void> {
  await ensureBudgetCanBeDecided(input.budgetId);
  const status: BudgetStatus = input.decision === "aprobar" ? "aprobada" : "rechazada";

  const { error } = await supabase
    .from("budgets")
    .update({
      status,
      approval_method: "internal",
      approval_notes: input.notes,
      approved_by_user_id: input.approvedByUserId,
      approved_at: input.decision === "aprobar" ? new Date().toISOString() : null,
      rejected_at: input.decision === "rechazar" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.budgetId);

  if (error) {
    throw new Error(error.message || "No se pudo actualizar el estado del presupuesto.");
  }

  await logAuditEvent({
    action: "approve",
    entity: "budgets",
    entityId: input.budgetId,
    userId: input.approvedByUserId,
    newValues: {
      status,
      method: "internal",
      notes: input.notes,
    },
  });

  await notifyBudgetDecision({
    budgetId: input.budgetId,
    decision: input.decision,
    method: "internal",
  });
}

export async function approveBudgetAsCustomer(input: {
  budgetId: string;
  decision: "aprobar" | "rechazar";
  notes: string | null;
}): Promise<void> {
  await ensureBudgetCanBeDecided(input.budgetId);
  await ensureBudgetNotExpired(input.budgetId);
  const status: BudgetStatus = input.decision === "aprobar" ? "aprobada" : "rechazada";

  const { error } = await supabase
    .from("budgets")
    .update({
      status,
      approval_method: "portal",
      approval_notes: input.notes,
      approved_at: input.decision === "aprobar" ? new Date().toISOString() : null,
      rejected_at: input.decision === "rechazar" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.budgetId);

  if (error) {
    throw new Error(error.message || "No se pudo actualizar la cotizacion.");
  }

  await logAuditEvent({
    action: "approve",
    entity: "budgets",
    entityId: input.budgetId,
    newValues: {
      status,
      method: "portal",
      notes: input.notes,
    },
  });

  await notifyBudgetDecision({
    budgetId: input.budgetId,
    decision: input.decision,
    method: "portal",
  });
}

export async function updateBudgetStatus(input: {
  budgetId: string;
  status: BudgetStatus;
  expiresAt?: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from("budgets")
    .update({
      status: input.status,
      expires_at: input.expiresAt ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.budgetId);

  if (error) {
    throw new Error(error.message || "No se pudo actualizar el estado del presupuesto.");
  }

  await logAuditEvent({
    action: "update",
    entity: "budgets",
    entityId: input.budgetId,
    newValues: {
      status: input.status,
      expiresAt: input.expiresAt ?? null,
    },
  });
}
