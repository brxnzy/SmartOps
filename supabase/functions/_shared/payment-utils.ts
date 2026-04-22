import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "https://esm.sh/pdf-lib@1.17.1";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

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
  page.drawRectangle({ x: 0, y: height - 126, width, height: 126, color: rgb(0.05, 0.08, 0.14) });
  page.drawRectangle({ x: 0, y: height - 126, width, height: 6, color: rgb(0.08, 0.62, 0.46) });

  page.drawText(input.title, {
    x: 40,
    y: height - 54,
    size: 24,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText(input.subtitle, {
    x: 40,
    y: height - 78,
    size: 11,
    font,
    color: rgb(0.83, 0.9, 0.97),
  });
  page.drawText(input.documentNumber, {
    x: 40,
    y: height - 96,
    size: 10,
    font: fontBold,
    color: rgb(0.77, 0.9, 0.85),
  });

  const image = input.companyLogoUrl ? await fetchRemoteImage(input.companyLogoUrl) : null;
  const boxX = width - 146;
  const boxY = height - 102;
  const boxWidth = 104;
  const boxHeight = 60;

  page.drawRectangle({ x: boxX, y: boxY, width: boxWidth, height: boxHeight, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: boxX, y: boxY, width: boxWidth, height: boxHeight, borderWidth: 1, borderColor: rgb(0.88, 0.91, 0.95) });

  if (image) {
    const embedded = image.type === "png" ? await pdfDoc.embedPng(image.bytes) : await pdfDoc.embedJpg(image.bytes);
    const ratio = Math.min((boxWidth - 12) / embedded.width, (boxHeight - 12) / embedded.height, 1);
    const drawWidth = embedded.width * ratio;
    const drawHeight = embedded.height * ratio;
    page.drawImage(embedded, {
      x: boxX + (boxWidth - drawWidth) / 2,
      y: boxY + (boxHeight - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight,
    });
  } else {
    page.drawRectangle({ x: boxX + 10, y: boxY + 12, width: 28, height: 28, color: rgb(0.08, 0.62, 0.46) });
    page.drawText("SO", {
      x: boxX + 15,
      y: boxY + 22,
      size: 13,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText("SmartOps", {
      x: boxX + 46,
      y: boxY + 29,
      size: 10,
      font: fontBold,
      color: rgb(0.14, 0.2, 0.3),
    });
    page.drawText("Platform", {
      x: boxX + 46,
      y: boxY + 17,
      size: 8,
      font,
      color: rgb(0.45, 0.53, 0.63),
    });
  }
}

export async function fetchCustomerEmail(adminClient: SupabaseClient, customerId: string): Promise<string | null> {
  const { data } = await adminClient.auth.admin.getUserById(customerId);
  return data?.user?.email ?? null;
}

function drawLabelValue(page: PDFPage, font: PDFFont, fontBold: PDFFont, x: number, y: number, label: string, value: string) {
  page.drawText(label, { x, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(value, { x, y: y - 14, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
}

export async function buildInvoicePdf(account: PaymentAccountContext): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const now = new Date();
  const { width } = page.getSize();

  await drawDocumentHeader(pdfDoc, page, font, fontBold, {
    title: "Factura de instalacion",
    subtitle: account.companyName,
    documentNumber: account.invoiceNumber,
    companyName: account.companyName,
    companyLogoUrl: account.companyLogoUrl,
  });

  drawLabelValue(page, font, fontBold, 40, 648, "Cliente", account.customerName);
  drawLabelValue(page, font, fontBold, 220, 648, "Cedula", account.customerIdCard ?? "N/D");
  drawLabelValue(page, font, fontBold, 400, 648, "Fecha", now.toLocaleDateString("es-DO"));

  drawLabelValue(page, font, fontBold, 40, 593, "Sitio", account.siteName ?? "N/D");
  drawLabelValue(page, font, fontBold, 220, 593, "Proyecto", account.projectId.slice(0, 8).toUpperCase());
  drawLabelValue(page, font, fontBold, 400, 593, "Estado", account.status);
  drawLabelValue(page, font, fontBold, 40, 538, "Empresa", account.companyName);
  drawLabelValue(page, font, fontBold, 220, 538, "Telefono", account.companyPhone ?? "N/D");
  drawLabelValue(page, font, fontBold, 400, 538, "RNC", account.companyRnc ?? "N/D");

  page.drawRectangle({ x: 40, y: 455, width: width - 80, height: 30, color: rgb(0.94, 0.96, 0.99) });
  page.drawText("Detalle del cobro", { x: 48, y: 466, size: 10, font: fontBold });
  page.drawText("Monto", { x: width - 125, y: 466, size: 10, font: fontBold });

  page.drawText(`Instalacion completada y aceptada en ${account.siteName ?? "sitio del cliente"}`, {
    x: 48,
    y: 430,
    size: 10,
    font,
  });
  page.drawText(formatCurrency(account.amountTotal, account.currency), {
    x: width - 125,
    y: 430,
    size: 10,
    font: fontBold,
  });

  page.drawLine({ start: { x: 40, y: 388 }, end: { x: width - 40, y: 388 }, thickness: 1, color: rgb(0.88, 0.9, 0.94) });
  page.drawText(`Total facturado: ${formatCurrency(account.amountTotal, account.currency)}`, {
    x: 40,
    y: 356,
    size: 13,
    font: fontBold,
  });
  page.drawText(`Pagado: ${formatCurrency(account.amountPaid, account.currency)}`, {
    x: 40,
    y: 332,
    size: 11,
    font,
  });
  page.drawText(`Pendiente: ${formatCurrency(account.amountPending, account.currency)}`, {
    x: 40,
    y: 310,
    size: 11,
    font,
  });

  const notes = wrapText(
    "Documento generado automaticamente al completarse la instalacion y aceptarse el acta de entrega. Puedes usar esta factura para seguimiento, validacion de pagos y soporte postventa.",
    92
  );
  let y = 248;
  page.drawText("Observaciones", { x: 40, y, size: 11, font: fontBold });
  y -= 18;
  notes.forEach((line) => {
    page.drawText(line, { x: 40, y, size: 10, font });
    y -= 14;
  });

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
    title: "Factura de pago",
    subtitle: account.companyName,
    documentNumber: transaction.receiptNumber ?? buildDocumentNumber("REC", transaction.id),
    companyName: account.companyName,
    companyLogoUrl: account.companyLogoUrl,
  });

  drawLabelValue(page, font, fontBold, 40, 648, "Cliente", account.customerName);
  drawLabelValue(page, font, fontBold, 220, 648, "Factura origen", account.invoiceNumber);
  drawLabelValue(page, font, fontBold, 400, 648, "Fecha", new Date(issuedAt).toLocaleDateString("es-DO"));

  drawLabelValue(page, font, fontBold, 40, 593, "Metodo", paymentMethodLabel(transaction.method));
  drawLabelValue(page, font, fontBold, 220, 593, "Referencia", transaction.reference ?? "N/D");
  drawLabelValue(page, font, fontBold, 400, 593, "Sitio", account.siteName ?? "N/D");
  drawLabelValue(page, font, fontBold, 40, 538, "Empresa", account.companyName);
  drawLabelValue(page, font, fontBold, 220, 538, "Telefono", account.companyPhone ?? "N/D");
  drawLabelValue(page, font, fontBold, 400, 538, "RNC", account.companyRnc ?? "N/D");

  page.drawRectangle({ x: 40, y: 428, width: 515.28, height: 84, color: rgb(0.94, 0.98, 0.96) });
  page.drawText("Monto aplicado", { x: 56, y: 476, size: 11, font: fontBold, color: rgb(0.06, 0.36, 0.2) });
  page.drawText(formatCurrency(transaction.amount, account.currency), {
    x: 56,
    y: 446,
    size: 22,
    font: fontBold,
    color: rgb(0.06, 0.36, 0.2),
  });
  page.drawText(`Saldo pendiente luego del pago: ${formatCurrency(account.amountPending, account.currency)}`, {
    x: 300,
    y: 462,
    size: 10,
    font,
    color: rgb(0.16, 0.25, 0.35),
  });
  page.drawText(`Total de la factura: ${formatCurrency(account.amountTotal, account.currency)}`, {
    x: 300,
    y: 444,
    size: 10,
    font,
    color: rgb(0.16, 0.25, 0.35),
  });

  page.drawText(`Detalle: pago aplicado a la instalacion facturada en ${account.siteName ?? "sitio del cliente"}.`, {
    x: 40,
    y: 380,
    size: 11,
    font,
  });

  if (transaction.notes) {
    const lines = wrapText(transaction.notes, 92);
    let y = 326;
    page.drawText("Notas", { x: 40, y, size: 11, font: fontBold });
    y -= 18;
    lines.forEach((line) => {
      page.drawText(line, { x: 40, y, size: 10, font });
      y -= 14;
    });
  }

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
    subtitle: account.companyName,
    documentNumber: buildDocumentNumber("EST", account.id),
    companyName: account.companyName,
    companyLogoUrl: account.companyLogoUrl,
  });

  drawLabelValue(page, font, fontBold, 40, 648, "Cliente", account.customerName);
  drawLabelValue(page, font, fontBold, 220, 648, "Factura", account.invoiceNumber);
  drawLabelValue(page, font, fontBold, 400, 648, "Sitio", account.siteName ?? "N/D");

  page.drawText(`Total facturado: ${formatCurrency(account.amountTotal, account.currency)}`, {
    x: 40,
    y: 595,
    size: 11,
    font: fontBold,
  });
  page.drawText(`Pagado: ${formatCurrency(account.amountPaid, account.currency)}`, {
    x: 40,
    y: 573,
    size: 10,
    font,
  });
  page.drawText(`Pendiente: ${formatCurrency(account.amountPending, account.currency)}`, {
    x: 40,
    y: 555,
    size: 10,
    font,
  });

  page.drawRectangle({ x: 40, y: 500, width: width - 80, height: 22, color: rgb(0.94, 0.96, 0.99) });
  page.drawText("Fecha", { x: 45, y: 508, size: 9, font: fontBold });
  page.drawText("Metodo", { x: 125, y: 508, size: 9, font: fontBold });
  page.drawText("Estado", { x: 220, y: 508, size: 9, font: fontBold });
  page.drawText("Referencia", { x: 310, y: 508, size: 9, font: fontBold });
  page.drawText("Monto", { x: width - 95, y: 508, size: 9, font: fontBold });

  let rowY = 482;
  transactions.slice(0, 18).forEach((transaction) => {
    const date = transaction.approvedAt ?? transaction.submittedAt ?? "-";
    page.drawText(date ? new Date(date).toLocaleDateString("es-DO") : "-", { x: 45, y: rowY, size: 8, font });
    page.drawText(paymentMethodLabel(transaction.method), { x: 125, y: rowY, size: 8, font });
    page.drawText(transaction.status, { x: 220, y: rowY, size: 8, font });
    page.drawText(transaction.reference ?? "-", { x: 310, y: rowY, size: 8, font });
    page.drawText(transaction.amount === null ? "-" : formatCurrency(transaction.amount, account.currency), {
      x: width - 95,
      y: rowY,
      size: 8,
      font,
    });
    rowY -= 18;
  });

  if (transactions.length === 0) {
    page.drawText("No hay transacciones registradas todavia.", { x: 45, y: rowY, size: 9, font });
  }

  return pdfDoc.save();
}
