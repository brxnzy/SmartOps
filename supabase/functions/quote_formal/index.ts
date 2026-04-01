import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-jwt",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

function formatCurrency(value: number): string {
  return value.toLocaleString("es-DO", { style: "currency", currency: "USD" });
}

function safeText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function buildQuoteNumber(budgetId: string): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const suffix = budgetId.replace(/-/g, "").slice(-6).toUpperCase();
  return `COT-${y}${m}${d}-${suffix}`;
}

async function fetchLogoBytes(url: string): Promise<{ bytes: Uint8Array; type: "png" | "jpg" } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (contentType.includes("png")) return { bytes: buffer, type: "png" };
    if (contentType.includes("jpeg") || contentType.includes("jpg")) return { bytes: buffer, type: "jpg" };
    return null;
  } catch {
    return null;
  }
}

function wrapText(text: string, maxLen: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxLen) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

type BudgetRoleRow = {
  company_id: string | null;
};

type BudgetItemRow = {
  quantity?: number | string | null;
  unit_price?: number | string | null;
  subtotal?: number | string | null;
  devices?: { name?: string | null; model?: string | null } | { name?: string | null; model?: string | null }[] | null;
  zones?: { name?: string | null } | { name?: string | null }[] | null;
};

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();

  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return jsonResponse(405, { error: "Method not allowed" });
    }

    console.log(`[quote_formal] request_id=${requestId} method=${req.method}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      console.log(`[quote_formal] request_id=${requestId} missing_env`);
      return jsonResponse(500, { error: "Missing SUPABASE_URL/ANON/SERVICE_ROLE keys." });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const bearerToken = authHeader.replace("Bearer ", "").trim();
    const userToken = (req.headers.get("x-user-jwt") ?? "").trim() || bearerToken;

    if (!userToken) {
      console.log(`[quote_formal] request_id=${requestId} missing_user_jwt`);
      return jsonResponse(401, { error: "Missing user jwt" });
    }

    const { companyId, budgetId, requestedByUserId, validUntil, terms } = (await req.json()) as {
      companyId: string;
      budgetId: string;
      requestedByUserId: string;
      validUntil: string | null;
      terms: string | null;
    };

    if (!companyId || !budgetId || !requestedByUserId) {
      return jsonResponse(400, { error: "companyId, budgetId, requestedByUserId son requeridos" });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authError } = await authClient.auth.getUser(userToken);
    if (authError || !authData.user) {
      console.log(`[quote_formal] request_id=${requestId} invalid_token`);
      return jsonResponse(401, { error: "Invalid access token" });
    }

    if (authData.user.id !== requestedByUserId) {
      return jsonResponse(403, { error: "Usuario autenticado no coincide con requestedByUserId" });
    }

    const { data: roles, error: rolesError } = await adminClient
      .from("user_roles")
      .select("company_id")
      .eq("user_id", requestedByUserId)
      .eq("company_id", companyId)
      .returns<BudgetRoleRow[]>();

    if (rolesError) {
      return jsonResponse(400, { error: rolesError.message });
    }

    const isCompanyMember = (roles ?? []).some((row) => row.company_id === companyId);
    if (!isCompanyMember) {
      return jsonResponse(403, { error: "No autorizado para esta compania" });
    }

    const { data: company, error: companyError } = await adminClient
      .from("companies")
      .select("id, name, address, phone, rnc, logo_url")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError || !company) {
      return jsonResponse(400, { error: companyError?.message ?? "Compania no encontrada" });
    }

    const { data: budget, error: budgetError } = await adminClient
      .from("budgets")
      .select(
        `
        id,
        company_id,
        survey_id,
        status,
        subtotal,
        tax_rate,
        tax_amount,
        total,
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
          devices:device_id ( name, model ),
          zones:zone_id ( name )
        )
        `
      )
      .eq("id", budgetId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (budgetError || !budget) {
      return jsonResponse(400, { error: budgetError?.message ?? "Presupuesto no encontrado" });
    }

    const budgetStatus = safeText((budget as Record<string, unknown>).status, "borrador").toLowerCase();
    if (budgetStatus !== "borrador" && budgetStatus !== "enviada") {
      return jsonResponse(409, { error: "La cotizacion no puede generarse desde el estado actual." });
    }

    const { data: existingProject, error: projectError } = await adminClient
      .from("installation_projects")
      .select("id")
      .eq("budget_id", budgetId)
      .maybeSingle();

    if (projectError) {
      return jsonResponse(500, { error: projectError.message });
    }

    if (existingProject?.id) {
      return jsonResponse(409, { error: "La cotizacion esta bloqueada porque la OT ya fue creada." });
    }

    const surveyRow = Array.isArray(budget.site_surveys) ? budget.site_surveys[0] : budget.site_surveys;
    const siteRow = Array.isArray(surveyRow?.customer_sites) ? surveyRow?.customer_sites[0] : surveyRow?.customer_sites;
    const customerRow = Array.isArray(surveyRow?.customers) ? surveyRow?.customers[0] : surveyRow?.customers;
    const customerUser = Array.isArray(customerRow?.users) ? customerRow?.users[0] : customerRow?.users;
    const customerId = safeText(customerRow?.user_id ?? "");

    let customerEmail: string | null = null;
    if (customerId) {
      const { data: authUser } = await adminClient.auth.admin.getUserById(customerId);
      customerEmail = authUser?.user?.email ?? null;
    }

    const items = (budget.budget_items ?? []) as BudgetItemRow[];

    const quoteNumber = buildQuoteNumber(budgetId);
    const createdAt = new Date();
    const validUntilDate = validUntil ? new Date(validUntil) : null;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    page.drawRectangle({ x: 0, y: height - 120, width, height: 120, color: rgb(0.06, 0.09, 0.16) });
    page.drawText("Cotizacion", {
      x: 40,
      y: height - 70,
      size: 26,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    const logoUrl = safeText(company.logo_url ?? "");
    if (logoUrl) {
      const logo = await fetchLogoBytes(logoUrl);
      if (logo) {
        const img = logo.type === "png" ? await pdfDoc.embedPng(logo.bytes) : await pdfDoc.embedJpg(logo.bytes);
        const imgDims = img.scale(0.25);
        page.drawImage(img, {
          x: width - imgDims.width - 40,
          y: height - imgDims.height - 30,
          width: imgDims.width,
          height: imgDims.height,
        });
      }
    }

    page.drawText(safeText(company.name, "Empresa"), {
      x: 40,
      y: height - 110,
      size: 12,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    const topY = height - 150;
    page.drawText(`Numero: ${quoteNumber}`, { x: 40, y: topY, size: 10, font });
    page.drawText(`Fecha: ${createdAt.toLocaleDateString("es-DO")}`, { x: 40, y: topY - 14, size: 10, font });
    page.drawText(`Valida hasta: ${validUntilDate ? validUntilDate.toLocaleDateString("es-DO") : "No definida"}`, {
      x: 40,
      y: topY - 28,
      size: 10,
      font,
    });

    page.drawText(`Cliente: ${safeText(customerUser?.name, "Cliente")}`, { x: 320, y: topY, size: 10, font });
    page.drawText(`Sitio: ${safeText(siteRow?.name, "Sitio")}`, { x: 320, y: topY - 14, size: 10, font });

    const tableTop = topY - 55;
    page.drawRectangle({ x: 40, y: tableTop, width: width - 80, height: 18, color: rgb(0.93, 0.94, 0.97) });
    page.drawText("Dispositivo", { x: 45, y: tableTop + 5, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    page.drawText("Zona", { x: 260, y: tableTop + 5, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    page.drawText("Cant.", { x: 360, y: tableTop + 5, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    page.drawText("Precio", { x: 410, y: tableTop + 5, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    page.drawText("Subtotal", { x: 480, y: tableTop + 5, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });

    let rowY = tableTop - 16;
    for (const item of items) {
      const device = Array.isArray(item.devices) ? item.devices[0] : item.devices;
      const zone = Array.isArray(item.zones) ? item.zones[0] : item.zones;
      const deviceName = safeText(device?.name ?? device?.model ?? "Dispositivo");
      const zoneName = safeText(zone?.name ?? "-");
      page.drawText(deviceName, { x: 45, y: rowY, size: 9, font });
      page.drawText(zoneName, { x: 260, y: rowY, size: 9, font });
      page.drawText(String(item.quantity ?? 0), { x: 360, y: rowY, size: 9, font });
      page.drawText(formatCurrency(safeNumber(item.unit_price)), { x: 410, y: rowY, size: 9, font });
      page.drawText(formatCurrency(safeNumber(item.subtotal)), { x: 480, y: rowY, size: 9, font });
      rowY -= 14;
      if (rowY < 160) break;
    }

    const totalsY = 140;
    page.drawText(`Subtotal: ${formatCurrency(safeNumber(budget.subtotal))}`, { x: 360, y: totalsY + 30, size: 10, font });
    page.drawText(`Impuestos: ${formatCurrency(safeNumber(budget.tax_amount))}`, { x: 360, y: totalsY + 16, size: 10, font });
    page.drawText(`Total: ${formatCurrency(safeNumber(budget.total))}`, { x: 360, y: totalsY + 2, size: 12, font: fontBold });

    const termsText = (terms ?? "").trim() || "Validez sujeta a disponibilidad. Instalacion coordinada con el cliente.";
    const termsLines = wrapText(termsText, 90);
    page.drawText("Condiciones:", { x: 40, y: totalsY + 30, size: 10, font: fontBold });
    let termsY = totalsY + 16;
    for (const line of termsLines) {
      page.drawText(line, { x: 40, y: termsY, size: 9, font });
      termsY -= 12;
      if (termsY < 60) break;
    }

    const pdfBytes = await pdfDoc.save();

    const pdfPath = `${companyId}/${budgetId}/cotizacion-${Date.now()}.pdf`;
    const { error: uploadError } = await adminClient.storage
      .from("quotes_pdfs")
      .upload(pdfPath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return jsonResponse(500, { error: uploadError.message });
    }

    const { data: signed } = await adminClient.storage
      .from("quotes_pdfs")
      .createSignedUrl(pdfPath, 60 * 60 * 24 * 7);

    const nowIso = new Date().toISOString();

    const { error: upsertError } = await adminClient
      .from("budget_quotes")
      .upsert(
        {
          company_id: companyId,
          budget_id: budgetId,
          status: "enviada",
          quote_number: quoteNumber,
          valid_until: validUntilDate ? validUntilDate.toISOString() : null,
          terms: termsText,
          pdf_path: pdfPath,
          sent_at: nowIso,
          created_by: requestedByUserId,
          updated_at: nowIso,
        },
        { onConflict: "budget_id" }
      );

    if (upsertError) {
      return jsonResponse(500, { error: upsertError.message });
    }

    const { error: budgetUpdateError } = await adminClient
      .from("budgets")
      .update({
        status: "enviada",
        sent_at: nowIso,
        expires_at: validUntilDate ? validUntilDate.toISOString() : null,
        updated_at: nowIso,
      })
      .eq("id", budgetId)
      .eq("company_id", companyId);

    if (budgetUpdateError) {
      return jsonResponse(500, { error: budgetUpdateError.message });
    }

    let emailSent = false;
    let warning: string | null = null;

    if (customerEmail) {
      try {
        const attachmentBase64 = bytesToBase64(pdfBytes);
        const html = `
          <div style="font-family: 'Inter', Arial, sans-serif; background:#f8fafc; padding:32px;">
            <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
              <div style="background:#0f172a;color:#fff;padding:24px 32px;">
                <h1 style="margin:0;font-size:22px;">Cotizacion formal</h1>
                <p style="margin:8px 0 0;font-size:14px;color:#cbd5f5;">${safeText(company.name, "Empresa")}</p>
              </div>
              <div style="padding:24px 32px;color:#0f172a;">
                <p style="margin:0 0 12px;font-size:14px;">Hola ${safeText(customerUser?.name, "cliente")},</p>
                <p style="margin:0 0 16px;font-size:14px;">Adjuntamos tu cotizacion formal en PDF.</p>
                <div style="background:#f1f5f9;border-radius:12px;padding:16px;margin-bottom:16px;">
                  <p style="margin:0 0 6px;font-size:13px;"><strong>Numero:</strong> ${quoteNumber}</p>
                  <p style="margin:0 0 6px;font-size:13px;"><strong>Valida hasta:</strong> ${validUntilDate ? validUntilDate.toLocaleDateString("es-DO") : "No definida"}</p>
                  <p style="margin:0;font-size:13px;"><strong>Total:</strong> ${formatCurrency(safeNumber(budget.total))}</p>
                </div>
                <p style="margin:0 0 10px;font-size:13px;color:#475569;">Si necesitas apoyo adicional, estaremos atentos.</p>
                <a href="${signed?.signedUrl ?? "#"}" style="display:inline-block;padding:10px 16px;border-radius:10px;background:#2563eb;color:#fff;text-decoration:none;font-size:13px;">Ver PDF en linea</a>
              </div>
              <div style="padding:16px 32px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
                Este correo fue generado automaticamente. Si tienes dudas, responde a este email.
              </div>
            </div>
          </div>
        `;

        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send_email_notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({
            companyId,
            to: customerEmail,
            type: "transaction",
            eventKey: "quote.sent",
            templateKey: "quote_formal",
            entityType: "budget",
            entityId: budgetId,
            subject: `Cotizacion ${quoteNumber}`,
            title: "Cotizacion formal enviada",
            message: `Hola ${safeText(customerUser?.name, "cliente")}, adjuntamos tu cotizacion formal.`,
            html,
            actionUrl: signed?.signedUrl ?? undefined,
            metadata: {
              budgetId,
              quoteNumber,
              validUntil: validUntilDate ? validUntilDate.toISOString() : null,
              total: safeNumber(budget.total),
            },
            attachments: [
              {
                filename: `cotizacion-${quoteNumber}.pdf`,
                contentBase64: attachmentBase64,
                contentType: "application/pdf",
              },
            ],
          }),
        });

        const rawResponse = await emailResponse.text().catch(() => "");
        if (!emailResponse.ok) {
          console.log(
            `[quote_formal] request_id=${requestId} send_email_notification_error status=${emailResponse.status} body=${rawResponse}`
          );
          warning = "El PDF fue generado pero el email no pudo enviarse.";
        } else {
          emailSent = true;
        }
      } catch (error) {
        console.log(
          `[quote_formal] request_id=${requestId} send_email_notification_exception ${(error as Error)?.message ?? String(error)}`
        );
        warning = "El PDF fue generado pero el email no pudo enviarse.";
      }
    } else {
      warning = "No hay email destino configurado. El PDF fue generado sin enviar email.";
    }

    return jsonResponse(200, {
      quoteId: budgetId,
      pdfUrl: signed?.signedUrl ?? null,
      emailSent,
      warning,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[quote_formal] request_id=${requestId} unhandled=${message}`);
    return jsonResponse(500, { error: message });
  }
});
