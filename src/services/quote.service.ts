import { supabase } from "../libs/supabase";
import type { BudgetQuote } from "../types/quote.types";

function safeText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function safeNullableText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return safeText(value, "");
}

export async function getBudgetQuote(budgetId: string, companyId: string): Promise<BudgetQuote | null> {
  const { data, error } = await supabase
    .from("budget_quotes")
    .select(
      "id, company_id, budget_id, status, quote_number, valid_until, terms, pdf_path, sent_at, created_at, updated_at"
    )
    .eq("budget_id", budgetId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "No se pudo cargar la cotizacion formal.");
  }

  if (!data) return null;

  return {
    id: safeText(data.id),
    companyId: safeText(data.company_id),
    budgetId: safeText(data.budget_id),
    status: (safeText(data.status, "borrador") as BudgetQuote["status"]) ?? "borrador",
    quoteNumber: safeText(data.quote_number),
    validUntil: safeNullableText(data.valid_until),
    terms: safeNullableText(data.terms),
    pdfPath: safeNullableText(data.pdf_path),
    sentAt: safeNullableText(data.sent_at),
    createdAt: safeText(data.created_at ?? new Date().toISOString()),
    updatedAt: safeText(data.updated_at ?? new Date().toISOString()),
  } satisfies BudgetQuote;
}

export async function getQuotePdfUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from("quotes_pdfs").createSignedUrl(path, 60 * 60 * 24 * 7);
  if (error) {
    throw new Error(error.message || "No se pudo generar el link del PDF.");
  }
  return data?.signedUrl ?? null;
}

export async function generateFormalQuote(input: {
  companyId: string;
  budgetId: string;
  requestedByUserId: string;
  validUntil: string | null;
  terms: string | null;
}): Promise<{ quote: BudgetQuote; pdfUrl: string | null; emailSent: boolean; warning?: string | null }> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    throw new Error(sessionError.message || "No se pudo validar la sesion.");
  }

  let accessToken = sessionData?.session?.access_token ?? null;
  const expiresAt = sessionData?.session?.expires_at ?? null;
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (!accessToken || (typeof expiresAt === "number" && expiresAt <= nowSeconds + 30)) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      throw new Error(refreshError.message || "Sesion expirada. Vuelve a iniciar sesion.");
    }
    accessToken = refreshed?.session?.access_token ?? null;
  }

  if (!accessToken) {
    throw new Error("Sesion expirada. Vuelve a iniciar sesion.");
  }

  const { data, error } = await supabase.functions.invoke("quote_formal", {
    body: {
      companyId: input.companyId,
      budgetId: input.budgetId,
      requestedByUserId: input.requestedByUserId,
      validUntil: input.validUntil,
      terms: input.terms,
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    const message = error.message || "No se pudo generar la cotizacion formal.";
    throw new Error(message);
  }

  const payload = (data ?? {}) as Record<string, unknown>;

  if (!payload?.quoteId) {
    throw new Error("No se pudo generar la cotizacion formal.");
  }

  const quote = await getBudgetQuote(input.budgetId, input.companyId);
  if (!quote) {
    throw new Error("No se pudo recuperar la cotizacion formal generada.");
  }

  return {
    quote,
    pdfUrl: typeof payload.pdfUrl === "string" ? (payload.pdfUrl as string) : null,
    emailSent: Boolean(payload.emailSent),
    warning: typeof payload.warning === "string" ? (payload.warning as string) : null,
  };
}


