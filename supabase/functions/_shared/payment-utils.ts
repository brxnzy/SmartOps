import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "https://esm.sh/pdf-lib@1.17.1";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { SMARTOPS_LOGO_PNG_BASE64 } from "./smartops-logo.ts";

export type PaymentAccountContext = {
  id: string;
  companyId: string;
  customerId: string;
  projectId: string;
  budgetId: string;
  status: string;
  currency: string;
  amountTotal: number;
  amountPaid: number;
  amountPending: number;
  invoiceNumber: string;
  invoicePdfPath: string | null;
  invoiceIssuedAt: string | null;
  companyName: string;
  companyAddress: string | null;
  companyPhone: string | null;
  companyRnc: string | null;
  companyLogoUrl: string | null;
  customerName: string;
  customerIdCard: string | null;
  siteName: string | null;
};

export type PaymentTransactionContext = {
  id: string;
  accountId: string;
  companyId: string;
  customerId: string;
  method: string;
  status: string;
  amount: number | null;
  reference: string | null;
  notes: string | null;
  proofFilePath: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  reviewNotes: string | null;
  receiptNumber: string | null;
  receiptPdfPath: string | null;
};

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

export function formatCurrency(value: number, currency = "USD"): string {
  void currency;
  return new Intl.NumberFormat("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function wrapText(text: string, maxLen: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (`${current} ${word}`.trim().length > maxLen) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }

  if (current) lines.push(current.trim());
  return lines;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function decodeBase64(input: string): Uint8Array {
  const normalized = input.includes(",") ? input.split(",")[1] ?? "" : input;
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function buildDocumentNumber(prefix: "FAC" | "REC" | "EST", id: string): string {
  const suffix = id.replace(/-/g, "").slice(-6).toUpperCase();
  return `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${suffix}`;
}

export function paymentMethodLabel(method: string): string {
  if (method === "cash") return "Efectivo";
  if (method === "bank_transfer") return "Transferencia";
  if (method === "card") return "Tarjeta";
  return "Otros";
}

const COLORS = {
  ink: rgb(0.1, 0.14, 0.2),
  muted: rgb(0.39, 0.45, 0.52),
  border: rgb(0.86, 0.89, 0.93),
  softBorder: rgb(0.92, 0.94, 0.97),
  surface: rgb(0.98, 0.99, 1),
  surfaceAlt: rgb(0.96, 0.97, 0.985),
  accent: rgb(0.18, 0.29, 0.46),
  accentSoft: rgb(0.93, 0.95, 0.98),
  success: rgb(0.08, 0.44, 0.27),
  warning: rgb(0.66, 0.42, 0.08),
  danger: rgb(0.62, 0.15, 0.15),
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "N/D";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/D";
  return parsed.toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(status: string): string {
  if (status === "paid") return "Pagada";
  if (status === "partial") return "Parcial";
  if (status === "reviewing") return "En revisión";
  if (status === "approved") return "Aprobada";
  if (status === "rejected") return "Rechazada";
  if (status === "submitted") return "Enviada";
  if (status === "pending") return "Pendiente";
  return status || "N/D";
}

export async function fetchPaymentAccountContext(
  adminClient: SupabaseClient,
  accountId: string
): Promise<PaymentAccountContext | null> {
  const { data, error } = await adminClient
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
      companies:company_id ( name, address, phone, rnc, logo_url ),
      users:customer_id ( name, id_card ),
      installation_projects:project_id ( customer_sites:site_id ( name ) )
      `
    )
    .eq("id", accountId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const company = pickSingle((data as { companies?: unknown }).companies as unknown);
  const customer = pickSingle((data as { users?: unknown }).users as unknown);
  const project = pickSingle((data as { installation_projects?: unknown }).installation_projects as unknown);
  const site = pickSingle((project as { customer_sites?: unknown } | null)?.customer_sites as unknown);

  return {
    id: safeText(data.id),
    companyId: safeText(data.company_id),
    customerId: safeText(data.customer_id),
    projectId: safeText(data.project_id),
    budgetId: safeText(data.budget_id),
    status: safeText(data.status, "pending"),
    currency: safeText(data.currency, "USD"),
    amountTotal: safeNumber(data.amount_total),
    amountPaid: safeNumber(data.amount_paid),
    amountPending: safeNumber(data.amount_pending),
    invoiceNumber: safeText(data.invoice_number),
    invoicePdfPath: safeNullableText(data.invoice_pdf_path),
    invoiceIssuedAt: safeNullableText(data.invoice_issued_at),
    companyName: safeText((company as { name?: unknown } | null)?.name, "SmartOps"),
    companyAddress: safeNullableText((company as { address?: unknown } | null)?.address),
    companyPhone: safeNullableText((company as { phone?: unknown } | null)?.phone),
    companyRnc: safeNullableText((company as { rnc?: unknown } | null)?.rnc),
    companyLogoUrl: safeNullableText((company as { logo_url?: unknown } | null)?.logo_url),
    customerName: safeText((customer as { name?: unknown } | null)?.name, "Cliente"),
    customerIdCard: safeNullableText((customer as { id_card?: unknown } | null)?.id_card),
    siteName: safeNullableText((site as { name?: unknown } | null)?.name),
  };
}

export async function fetchPaymentTransactionsByAccount(
  adminClient: SupabaseClient,
  accountId: string
): Promise<PaymentTransactionContext[]> {
  const { data, error } = await adminClient
    .from("payment_transactions")
    .select(
      "id, payment_account_id, company_id, customer_id, method, status, amount, reference, notes, proof_file_path, submitted_at, approved_at, rejected_at, review_notes, receipt_number, receipt_pdf_path"
    )
    .eq("payment_account_id", accountId)
    .order("created_at", { ascending: false });

  if (error) return [];

  return (data ?? []).map((row) => {
    const status = safeText(row.status, "submitted");
    const amount = safeNullableNumber(row.amount);

    return {
      id: safeText(row.id),
      accountId: safeText(row.payment_account_id),
      companyId: safeText(row.company_id),
      customerId: safeText(row.customer_id),
      method: safeText(row.method, "other"),
      status,
      amount: status === "submitted" ? null : amount,
      reference: safeNullableText(row.reference),
      notes: safeNullableText(row.notes),
      proofFilePath: safeNullableText(row.proof_file_path),
      submittedAt: safeNullableText(row.submitted_at),
      approvedAt: safeNullableText(row.approved_at),
      rejectedAt: safeNullableText(row.rejected_at),
      reviewNotes: safeNullableText(row.review_notes),
      receiptNumber: safeNullableText(row.receipt_number),
      receiptPdfPath: safeNullableText(row.receipt_pdf_path),
    };
  });
}

export async function fetchPaymentTransactionContext(
  adminClient: SupabaseClient,
  transactionId: string
): Promise<PaymentTransactionContext | null> {
  const { data, error } = await adminClient
    .from("payment_transactions")
    .select(
      "id, payment_account_id, company_id, customer_id, method, status, amount, reference, notes, proof_file_path, submitted_at, approved_at, rejected_at, review_notes, receipt_number, receipt_pdf_path"
    )
    .eq("id", transactionId)
    .maybeSingle();

  if (error || !data) return null;

  const status = safeText(data.status, "submitted");
  const amount = safeNullableNumber(data.amount);

  return {
    id: safeText(data.id),
    accountId: safeText(data.payment_account_id),
    companyId: safeText(data.company_id),
    customerId: safeText(data.customer_id),
    method: safeText(data.method, "other"),
    status,
    amount: status === "submitted" ? null : amount,
    reference: safeNullableText(data.reference),
    notes: safeNullableText(data.notes),
    proofFilePath: safeNullableText(data.proof_file_path),
    submittedAt: safeNullableText(data.submitted_at),
    approvedAt: safeNullableText(data.approved_at),
    rejectedAt: safeNullableText(data.rejected_at),
    reviewNotes: safeNullableText(data.review_notes),
    receiptNumber: safeNullableText(data.receipt_number),
    receiptPdfPath: safeNullableText(data.receipt_pdf_path),
  };
}

async function fetchRemoteImage(url: string): Promise<{ bytes: Uint8Array; type: "png" | "jpg" } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (contentType.includes("png")) return { bytes, type: "png" };
    if (contentType.includes("jpeg") || contentType.includes("jpg")) return { bytes, type: "jpg" };
    return null;
  } catch {
    return null;
  }
}

function getFallbackLogoImage(): { bytes: Uint8Array; type: "png" } {
  return { bytes: decodeBase64(SMARTOPS_LOGO_PNG_BASE64), type: "png" };
}

async function drawDocumentHeader(
  pdfDoc: PDFDocument,
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  input: {
    title: string;
    subtitle: string;
    documentNumber: string;
    companyName: string;
    companyLogoUrl: string | null;
  }
) {
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 0, y: height - 170, width, height: 170, color: COLORS.surfaceAlt });
  page.drawRectangle({ x: 40, y: height - 56, width: width - 80, height: 2, color: COLORS.ink });

  const image = input.companyLogoUrl ? await fetchRemoteImage(input.companyLogoUrl) : null;
  const logo = image ?? getFallbackLogoImage();
  const embedded = logo.type === "png" ? await pdfDoc.embedPng(logo.bytes) : await pdfDoc.embedJpg(logo.bytes);
  const logoBoxX = 40;
  const logoBoxY = height - 128;
  const logoBoxWidth = 78;
  const logoBoxHeight = 78;
  const ratio = Math.min((logoBoxWidth - 10) / embedded.width, (logoBoxHeight - 10) / embedded.height, 1);
  const drawWidth = embedded.width * ratio;
  const drawHeight = embedded.height * ratio;

  page.drawRectangle({ x: logoBoxX, y: logoBoxY, width: logoBoxWidth, height: logoBoxHeight, color: rgb(1, 1, 1) });
  page.drawRectangle({
    x: logoBoxX,
    y: logoBoxY,
    width: logoBoxWidth,
    height: logoBoxHeight,
    borderWidth: 1,
    borderColor: COLORS.border,
  });
  page.drawImage(embedded, {
    x: logoBoxX + (logoBoxWidth - drawWidth) / 2,
    y: logoBoxY + (logoBoxHeight - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight,
  });

  page.drawText(input.title, {
    x: 134,
    y: height - 82,
    size: 24,
    font: fontBold,
    color: COLORS.ink,
  });
  page.drawText(input.companyName, {
    x: 134,
    y: height - 104,
    size: 10,
    font: fontBold,
    color: COLORS.accent,
  });
  page.drawText(input.subtitle, {
    x: 134,
    y: height - 119,
    size: 9,
    font,
    color: COLORS.muted,
  });

  page.drawRectangle({
    x: width - 205,
    y: height - 124,
    width: 165,
    height: 72,
    color: rgb(1, 1, 1),
  });
  page.drawRectangle({
    x: width - 205,
    y: height - 124,
    width: 165,
    height: 72,
    borderWidth: 1,
    borderColor: COLORS.border,
  });
  page.drawText("Documento", {
    x: width - 190,
    y: height - 78,
    size: 8,
    font: fontBold,
    color: COLORS.muted,
  });
  page.drawText(input.documentNumber, {
    x: width - 190,
    y: height - 93,
    size: 10,
    font: fontBold,
    color: COLORS.ink,
  });
  page.drawText("Emitido", {
    x: width - 190,
    y: height - 108,
    size: 8,
    font: fontBold,
    color: COLORS.muted,
  });
  page.drawText(formatDate(new Date().toISOString()), {
    x: width - 190,
    y: height - 120,
    size: 9,
    font,
    color: COLORS.ink,
  });
}

function drawSectionTitle(page: PDFPage, fontBold: PDFFont, x: number, y: number, title: string) {
  page.drawText(title, {
    x,
    y,
    size: 10,
    font: fontBold,
    color: rgb(0.12, 0.17, 0.24),
  });
}

function drawInfoBox(page: PDFPage, x: number, y: number, width: number, height: number) {
  page.drawRectangle({ x, y, width, height, color: COLORS.surface });
  page.drawRectangle({ x, y, width, height, borderWidth: 1, borderColor: COLORS.border });
}

function drawFooter(page: PDFPage, font: PDFFont, fontBold: PDFFont) {
  page.drawLine({
    start: { x: 40, y: 54 },
    end: { x: page.getSize().width - 40, y: 54 },
    thickness: 1,
    color: COLORS.border,
  });
  page.drawText("SmartOps", {
    x: 40,
    y: 38,
    size: 9,
    font: fontBold,
    color: COLORS.ink,
  });
  page.drawText("Documento generado para control, seguimiento y consulta interna.", {
    x: 100,
    y: 38,
    size: 8,
    font,
    color: COLORS.muted,
  });
}

export async function fetchCustomerEmail(adminClient: SupabaseClient, customerId: string): Promise<string | null> {
  const { data } = await adminClient.auth.admin.getUserById(customerId);
  return data?.user?.email ?? null;
}

function drawLabelValue(page: PDFPage, font: PDFFont, fontBold: PDFFont, x: number, y: number, label: string, value: string) {
  page.drawText(label, { x, y, size: 9, font: fontBold, color: COLORS.muted });
  page.drawText(value, { x, y: y - 14, size: 10, font, color: COLORS.ink });
}

function drawMetricCard(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  emphasized = false
) {
  page.drawRectangle({
    x,
    y,
    width,
    height: 64,
    color: emphasized ? COLORS.accentSoft : rgb(1, 1, 1),
  });
  page.drawRectangle({
    x,
    y,
    width,
    height: 64,
    borderWidth: 1,
    borderColor: emphasized ? COLORS.accent : COLORS.border,
  });
  page.drawText(label, {
    x: x + 14,
    y: y + 42,
    size: 8,
    font: fontBold,
    color: COLORS.muted,
  });
  page.drawText(value, {
    x: x + 14,
    y: y + 18,
    size: emphasized ? 18 : 14,
    font: fontBold,
    color: COLORS.ink,
  });
}

function drawTableHeader(page: PDFPage, x: number, y: number, width: number, height: number) {
  page.drawRectangle({ x, y, width, height, color: COLORS.surfaceAlt });
  page.drawRectangle({ x, y, width, height, borderWidth: 1, borderColor: COLORS.border });
}

export async function buildInvoicePdf(account: PaymentAccountContext): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width } = page.getSize();

  await drawDocumentHeader(pdfDoc, page, font, fontBold, {
    title: "Factura de instalacion",
    subtitle: "Documento emitido al completar y aceptar la instalación del cliente.",
    documentNumber: account.invoiceNumber,
    companyName: account.companyName,
    companyLogoUrl: account.companyLogoUrl,
  });

  drawSectionTitle(page, fontBold, 40, 640, "Información general");
  drawInfoBox(page, 40, 540, width - 80, 86);
  drawLabelValue(page, font, fontBold, 52, 600, "Cliente", account.customerName);
  drawLabelValue(page, font, fontBold, 220, 600, "Cedula", account.customerIdCard ?? "N/D");
  drawLabelValue(page, font, fontBold, 400, 600, "Sitio", account.siteName ?? "N/D");
  drawLabelValue(page, font, fontBold, 52, 560, "Empresa", account.companyName);
  drawLabelValue(page, font, fontBold, 220, 560, "Telefono", account.companyPhone ?? "N/D");
  drawLabelValue(page, font, fontBold, 400, 560, "RNC", account.companyRnc ?? "N/D");

  drawSectionTitle(page, fontBold, 40, 508, "Resumen financiero");
  drawMetricCard(page, font, fontBold, 40, 430, 165, "Total facturado", formatCurrency(account.amountTotal, account.currency), true);
  drawMetricCard(page, font, fontBold, 215, 430, 165, "Pagado", formatCurrency(account.amountPaid, account.currency));
  drawMetricCard(page, font, fontBold, 390, 430, 165, "Pendiente", formatCurrency(account.amountPending, account.currency));

  drawSectionTitle(page, fontBold, 40, 392, "Detalle facturado");
  drawTableHeader(page, 40, 352, width - 80, 28);
  page.drawText("Concepto", { x: 52, y: 362, size: 9, font: fontBold, color: COLORS.ink });
  page.drawText("Estado", { x: 350, y: 362, size: 9, font: fontBold, color: COLORS.ink });
  page.drawText("Monto", { x: width - 112, y: 362, size: 9, font: fontBold, color: COLORS.ink });
  page.drawRectangle({ x: 40, y: 300, width: width - 80, height: 52, borderWidth: 1, borderColor: COLORS.border });
  page.drawText(`Instalación completada y aceptada en ${account.siteName ?? "sitio del cliente"}.`, {
    x: 52,
    y: 326,
    size: 10,
    font,
    color: COLORS.ink,
  });
  page.drawText(statusLabel(account.status), {
    x: 350,
    y: 326,
    size: 10,
    font: fontBold,
    color: account.amountPending > 0 ? COLORS.warning : COLORS.success,
  });
  page.drawText(formatCurrency(account.amountTotal, account.currency), {
    x: width - 112,
    y: 326,
    size: 10,
    font: fontBold,
    color: COLORS.ink,
  });

  const notes = wrapText(
    "Documento generado al completarse la instalación y aceptarse el acta de entrega. Úselo como soporte operativo y validación del servicio prestado.",
    95
  );
  let y = 252;
  drawSectionTitle(page, fontBold, 40, y, "Observaciones");
  y -= 22;
  notes.forEach((line) => {
    page.drawText(line, { x: 40, y, size: 10, font, color: COLORS.muted });
    y -= 14;
  });

  drawFooter(page, font, fontBold);

  return pdfDoc.save();
}

export async function buildReceiptPdf(
  account: PaymentAccountContext,
  transaction: PaymentTransactionContext
): Promise<Uint8Array> {
  if (transaction.amount === null) {
    throw new Error("La transaccion aprobada debe tener monto para generar el documento.");
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const issuedAt = transaction.approvedAt ?? transaction.submittedAt ?? new Date().toISOString();

  await drawDocumentHeader(pdfDoc, page, font, fontBold, {
    title: "Recibo de pago",
    subtitle: "Comprobante emitido por un pago aplicado a la factura de instalación.",
    documentNumber: transaction.receiptNumber ?? buildDocumentNumber("REC", transaction.id),
    companyName: account.companyName,
    companyLogoUrl: account.companyLogoUrl,
  });

  drawSectionTitle(page, fontBold, 40, 640, "Información del pago");
  drawInfoBox(page, 40, 540, page.getSize().width - 80, 86);
  drawLabelValue(page, font, fontBold, 52, 600, "Cliente", account.customerName);
  drawLabelValue(page, font, fontBold, 220, 600, "Factura origen", account.invoiceNumber);
  drawLabelValue(page, font, fontBold, 400, 600, "Fecha", formatDate(issuedAt));
  drawLabelValue(page, font, fontBold, 52, 560, "Metodo", paymentMethodLabel(transaction.method));
  drawLabelValue(page, font, fontBold, 220, 560, "Referencia", transaction.reference ?? "N/D");
  drawLabelValue(page, font, fontBold, 400, 560, "Sitio", account.siteName ?? "N/D");

  drawSectionTitle(page, fontBold, 40, 508, "Aplicación financiera");
  drawMetricCard(page, font, fontBold, 40, 430, 165, "Monto aplicado", formatCurrency(transaction.amount, account.currency), true);
  drawMetricCard(page, font, fontBold, 215, 430, 165, "Factura origen", formatCurrency(account.amountTotal, account.currency));
  drawMetricCard(page, font, fontBold, 390, 430, 165, "Saldo pendiente", formatCurrency(account.amountPending, account.currency));

  drawSectionTitle(page, fontBold, 40, 392, "Detalle");
  drawTableHeader(page, 40, 352, 515.28, 28);
  page.drawText("Concepto", { x: 52, y: 362, size: 9, font: fontBold, color: COLORS.ink });
  page.drawText("Estado", { x: 350, y: 362, size: 9, font: fontBold, color: COLORS.ink });
  page.drawText("Monto", { x: 500, y: 362, size: 9, font: fontBold, color: COLORS.ink });
  page.drawRectangle({ x: 40, y: 300, width: 515.28, height: 52, borderWidth: 1, borderColor: COLORS.border });
  page.drawText(`Pago aplicado a la instalación facturada en ${account.siteName ?? "sitio del cliente"}.`, {
    x: 52,
    y: 326,
    size: 10,
    font,
    color: COLORS.ink,
  });
  page.drawText(statusLabel(transaction.status), {
    x: 350,
    y: 326,
    size: 10,
    font: fontBold,
    color: transaction.status === "approved" ? COLORS.success : COLORS.warning,
  });
  page.drawText(formatCurrency(transaction.amount, account.currency), {
    x: 500,
    y: 326,
    size: 10,
    font: fontBold,
    color: COLORS.ink,
  });

  if (transaction.notes) {
    const lines = wrapText(transaction.notes, 95);
    let y = 252;
    drawSectionTitle(page, fontBold, 40, y, "Notas");
    y -= 18;
    lines.forEach((line) => {
      page.drawText(line, { x: 40, y, size: 10, font, color: COLORS.muted });
      y -= 14;
    });
  }

  drawFooter(page, font, fontBold);

  return pdfDoc.save();
}

export async function buildStatementPdf(
  account: PaymentAccountContext,
  transactions: PaymentTransactionContext[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width } = page.getSize();

  await drawDocumentHeader(pdfDoc, page, font, fontBold, {
    title: "Estado de cuenta",
    subtitle: "Resumen consolidado de pagos y saldo vigente del cliente.",
    documentNumber: buildDocumentNumber("EST", account.id),
    companyName: account.companyName,
    companyLogoUrl: account.companyLogoUrl,
  });

  drawSectionTitle(page, fontBold, 40, 640, "Resumen de la cuenta");
  drawInfoBox(page, 40, 540, width - 80, 86);
  drawLabelValue(page, font, fontBold, 52, 600, "Cliente", account.customerName);
  drawLabelValue(page, font, fontBold, 220, 600, "Factura", account.invoiceNumber);
  drawLabelValue(page, font, fontBold, 400, 600, "Sitio", account.siteName ?? "N/D");
  drawLabelValue(page, font, fontBold, 52, 560, "Total facturado", formatCurrency(account.amountTotal, account.currency));
  drawLabelValue(page, font, fontBold, 220, 560, "Pagado", formatCurrency(account.amountPaid, account.currency));
  drawLabelValue(page, font, fontBold, 400, 560, "Pendiente", formatCurrency(account.amountPending, account.currency));

  drawMetricCard(page, font, fontBold, 40, 448, 165, "Estado", statusLabel(account.status), true);
  drawMetricCard(page, font, fontBold, 215, 448, 165, "Movimientos", String(transactions.length));
  drawMetricCard(page, font, fontBold, 390, 448, 165, "Última emisión", formatDate(new Date().toISOString()));

  drawSectionTitle(page, fontBold, 40, 412, "Historial de movimientos");
  drawTableHeader(page, 40, 376, width - 80, 24);
  page.drawText("Fecha", { x: 45, y: 385, size: 9, font: fontBold, color: COLORS.ink });
  page.drawText("Metodo", { x: 125, y: 385, size: 9, font: fontBold, color: COLORS.ink });
  page.drawText("Estado", { x: 220, y: 385, size: 9, font: fontBold, color: COLORS.ink });
  page.drawText("Referencia", { x: 305, y: 385, size: 9, font: fontBold, color: COLORS.ink });
  page.drawText("Monto", { x: width - 95, y: 385, size: 9, font: fontBold, color: COLORS.ink });

  let rowY = 352;
  transactions.slice(0, 15).forEach((transaction) => {
    const date = transaction.approvedAt ?? transaction.submittedAt ?? "-";
    page.drawRectangle({ x: 40, y: rowY - 8, width: width - 80, height: 20, borderWidth: 0.5, borderColor: COLORS.softBorder });
    page.drawText(date ? formatDate(date) : "-", { x: 45, y: rowY, size: 8, font, color: COLORS.ink });
    page.drawText(paymentMethodLabel(transaction.method), { x: 125, y: rowY, size: 8, font, color: COLORS.ink });
    page.drawText(statusLabel(transaction.status), {
      x: 220,
      y: rowY,
      size: 8,
      font: fontBold,
      color:
        transaction.status === "approved"
          ? COLORS.success
          : transaction.status === "rejected"
            ? COLORS.danger
            : COLORS.warning,
    });
    page.drawText(transaction.reference ?? "-", { x: 305, y: rowY, size: 8, font, color: COLORS.ink });
    page.drawText(transaction.amount === null ? "-" : formatCurrency(transaction.amount, account.currency), {
      x: width - 95,
      y: rowY,
      size: 8,
      font: fontBold,
      color: COLORS.ink,
    });
    rowY -= 20;
  });

  if (transactions.length === 0) {
    page.drawText("No hay transacciones registradas todavía.", { x: 45, y: rowY, size: 9, font, color: COLORS.muted });
  }

  drawFooter(page, font, fontBold);

  return pdfDoc.save();
}
