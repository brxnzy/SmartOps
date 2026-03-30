import { supabase } from "../libs/supabase";
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

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
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
}

export async function createBudgetApprovalLink(input: {
  budgetId: string;
  expiresAt: string;
}): Promise<{ token: string; linkId: string; url: string }> {
  const token = `${crypto.randomUUID()}${Math.random().toString(36).slice(2)}`;
  const { data, error } = await supabase.rpc("create_budget_approval_link", {
    p_budget_id: input.budgetId,
    p_token: token,
    p_expires_at: input.expiresAt,
  });

  if (error) {
    throw new Error(error.message || "No se pudo crear el link de aprobacion.");
  }

  const baseUrl = window.location.origin;
  return {
    token,
    linkId: safeText(data),
    url: `${baseUrl}/quote/${token}`,
  };
}

export async function approveBudgetInternal(input: {
  budgetId: string;
  approvedByUserId: string;
  notes: string | null;
  decision: "aprobar" | "rechazar";
}): Promise<void> {
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
}

export async function approveBudgetAsCustomer(input: {
  budgetId: string;
  decision: "aprobar" | "rechazar";
  notes: string | null;
}): Promise<void> {
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
}

export async function approveBudgetByToken(input: {
  token: string;
  decision: "aprobar" | "rechazar";
  notes: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc("approve_budget_by_token", {
    p_token: input.token,
    p_decision: input.decision,
    p_notes: input.notes,
  });

  if (error) {
    throw new Error(error.message || "No se pudo procesar la aprobacion.");
  }

  return safeText(data);
}
