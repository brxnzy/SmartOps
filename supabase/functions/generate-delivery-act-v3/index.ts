import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-jwt",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type DeviceSnapshot = {
  deviceId: string | null;
  name: string;
  model: string | null;
  brand: string | null;
  zoneName: string | null;
  serial: string | null;
  mac: string | null;
  quantity: number;
};

type CredentialSnapshot = {
  label: string;
  username: string | null;
  notes: string | null;
};

type DeliveryActSettingsRow = {
  warranty_months: number | null;
  warranty_terms: string | null;
  credentials_notice: string | null;
};

type CompanyRow = {
  id: string;
  name: string | null;
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

function pickSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatDateTime(value: string | null) {
  if (!value) return "Sin fecha";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sin fecha";
  return parsed.toLocaleString("es-DO");
}

function chunkText(text: string, max = 90): string[] {
  const trimmed = text.trim();
  if (!trimmed) return ["-"];
  const chunks: string[] = [];
  let current = trimmed;
  while (current.length > max) {
    chunks.push(current.slice(0, max));
    current = current.slice(max);
  }
  chunks.push(current);
  return chunks;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  return btoa(binary);
}

function truncateMiddle(value: string, max = 32): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  const head = Math.max(10, Math.floor((max - 3) / 2));
  const tail = Math.max(10, max - 3 - head);
  return `${trimmed.slice(0, head)}...${trimmed.slice(-tail)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse(500, { error: "Missing Supabase env vars" });
  }

  try {
    const bearerToken = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
    const userToken = (req.headers.get("x-user-jwt") ?? "").trim() || bearerToken;
    if (!userToken) return jsonResponse(401, { error: "Missing user jwt" });

    const { projectId } = (await req.json()) as { projectId: string };
    if (!projectId) return jsonResponse(400, { error: "projectId es requerido" });

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authError } = await authClient.auth.getUser(userToken);
    if (authError || !authData.user) return jsonResponse(401, { error: "Invalid access token" });

    const { data: project, error: projectError } = await adminClient
      .from("installation_projects")
      .select(
        `
        id,
        company_id,
        site_id,
        customer_sites:site_id ( id, name ),
        budgets:budget_id (
          id,
          survey_id,
          site_surveys:survey_id (
            id,
            customer_id,
            customers:customer_id (
              user_id,
              users:users!customers_user_id_fkey ( id, name )
            )
          )
        ),
        technical_visits (
          id,
          technician_id,
          users:technician_id ( id, name )
        )
        `
      )
      .eq("id", projectId)
      .maybeSingle();

    if (projectError || !project) {
      return jsonResponse(404, { error: projectError?.message ?? "Proyecto no encontrado." });
    }

    const companyId = safeText(project.company_id ?? "");
    if (!companyId) return jsonResponse(400, { error: "Proyecto sin compania." });

    const { data: roles, error: rolesError } = await adminClient
      .from("user_roles")
      .select("company_id, role_id, roles:role_id ( name )")
      .eq("user_id", authData.user.id);

    if (rolesError) return jsonResponse(400, { error: rolesError.message });

    const isCompanyMember = (roles ?? []).some((row) => row.company_id === companyId);
    const isGlobalAdmin = (roles ?? []).some(
      (row) => !row.company_id && safeText(row.roles?.name).toLowerCase() === "admin"
    );

    if (!isCompanyMember && !isGlobalAdmin) {
      return jsonResponse(403, { error: "No autorizado para esta compania" });
    }

    const { data: existing } = await adminClient
      .from("delivery_acts")
      .select("id, status, pdf_path, pdf_url")
      .eq("project_id", projectId)
      .maybeSingle();

    if (existing?.id) {
      const status = safeText(existing.status, "pending");
      if (status !== "pending") {
        return jsonResponse(409, { error: "El acta ya fue firmada/aceptada." });
      }

      let pdfUrl = safeText(existing.pdf_url ?? "");
      if (!pdfUrl && existing.pdf_path) {
        const { data: signed } = await adminClient.storage
          .from("delivery_acts")
          .createSignedUrl(existing.pdf_path, 60 * 60 * 24 * 7);
        pdfUrl = signed?.signedUrl ?? "";
        if (pdfUrl) {
          await adminClient
            .from("delivery_acts")
            .update({ pdf_url: pdfUrl, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
        }
      }

      return jsonResponse(200, { actId: existing.id, pdfUrl: pdfUrl || null, reused: true });
    }

    const { data: installedRows, error: installedError } = await adminClient
      .from("installed_devices")
      .select(
        `
        id,
        catalog_device_id,
        serial,
        mac,
        firmware,
        location_detail,
        installed_at,
        installed_by,
        status,
        devices:catalog_device_id ( id, name, model, brand_id, brands:brand_id ( name ) ),
        customer_site_zones:zone_id ( id, name )
        `
      )
      .eq("company_id", companyId)
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("installed_at", { ascending: false });

    if (installedError) return jsonResponse(400, { error: installedError.message });
    if (!installedRows || installedRows.length === 0) {
      return jsonResponse(409, { error: "Debes registrar dispositivos instalados antes de generar el acta." });
    }

    const { data: company } = await adminClient
      .from("companies")
      .select("id, name")
      .eq("id", companyId)
      .maybeSingle<{ id: string; name: string | null }>();

    const companyName = safeText(company?.name, "SmartOps");

    const devicesSnapshot: DeviceSnapshot[] = installedRows.map((row) => {
      const device = pickSingle((row as { devices?: unknown }).devices as unknown);
      const brand = pickSingle((device as { brands?: unknown } | null)?.brands ?? null);
      const zone = pickSingle((row as { customer_site_zones?: unknown }).customer_site_zones as unknown);
      return {
        deviceId: safeText(row.catalog_device_id, "") || null,
        name: safeText((device as { name?: unknown } | null)?.name, "Dispositivo"),
        model: safeText((device as { model?: unknown } | null)?.model, "") || null,
        brand: safeText((brand as { name?: unknown } | null)?.name, "") || null,
        zoneName: safeText((zone as { name?: unknown } | null)?.name, "") || null,
        serial: safeText(row.serial, "") || null,
        mac: safeText(row.mac, "") || null,
        quantity: 1,
      };
    });

    const { data: credentialsRows } = await adminClient
      .from("delivery_act_credentials")
      .select("label, username, notes")
      .eq("company_id", companyId)
      .eq("project_id", projectId);

    const credentialsSnapshot: CredentialSnapshot[] = (credentialsRows ?? []).map((row) => ({
      label: safeText(row.label, "Acceso"),
      username: safeText(row.username, "") || null,
      notes: safeText(row.notes, "") || null,
    }));

    const { data: settings } = await adminClient
      .from("delivery_act_settings")
      .select("warranty_months, warranty_terms, credentials_notice")
      .eq("company_id", companyId)
      .maybeSingle<DeliveryActSettingsRow>();

    const warrantyTerms = safeText(settings?.warranty_terms, "") || null;

    const { data: company } = await adminClient
      .from("companies")
      .select("id, name")
      .eq("id", companyId)
      .maybeSingle<CompanyRow>();

    const companyName = safeText(company?.name, "SmartOps");

    const actId = crypto.randomUUID();
    const deliveredAtIso = new Date().toISOString();
    const pdfPath = `${companyId}/projects/${projectId}/delivery-acts/${actId}.pdf`;

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pageMarginX = 48;
    const pageMarginBottom = 48;
    const headerHeight = 78;

    const slate900 = rgb(0.06, 0.09, 0.16);
    const slate700 = rgb(0.2, 0.25, 0.35);
    const slate500 = rgb(0.39, 0.45, 0.55);
    const slate200 = rgb(0.88, 0.9, 0.93);
    const slate100 = rgb(0.95, 0.96, 0.98);
    const blue600 = rgb(0.15, 0.39, 0.92);
    const white = rgb(1, 1, 1);

    const wrapText = (text: string, maxWidth: number, size: number, bold = false): string[] => {
      const words = text.split(/\s+/).filter(Boolean);
      if (words.length === 0) return [''];
      const lines: string[] = [];
      const activeFont = bold ? fontBold : font;
      let current = words[0] ?? '';
      for (let i = 1; i < words.length; i += 1) {
        const next = `${current} ${words[i]}`;
        const nextWidth = activeFont.widthOfTextAtSize(next, size);
        if (nextWidth <= maxWidth) {
          current = next;
        } else {
          lines.push(current);
          current = words[i] ?? '';
        }
      }
      lines.push(current);
      return lines;
    };

    const drawHeader = (page: any, width: number, height: number) => {
      page.drawRectangle({ x: 0, y: height - headerHeight, width, height: headerHeight, color: slate900 });

      page.drawText('ACTA DE ENTREGA', {
        x: pageMarginX,
        y: height - 46,
        size: 16,
        font: fontBold,
        color: white,
      });

      page.drawText(companyName, {
        x: pageMarginX,
        y: height - 64,
        size: 10,
        font,
        color: rgb(0.82, 0.85, 0.92),
      });

      const badgeText = `#${actId.slice(0, 8)}`;
      const badgeSize = 10;
      const badgePaddingX = 10;
      const badgePaddingY = 6;
      const badgeWidth = fontBold.widthOfTextAtSize(badgeText, badgeSize) + badgePaddingX * 2;
      const badgeX = width - pageMarginX - badgeWidth;
      const badgeY = height - 56;

      page.drawRectangle({
        x: badgeX,
        y: badgeY,
        width: badgeWidth,
        height: badgeSize + badgePaddingY * 2,
        color: rgb(0.11, 0.16, 0.26),
        borderColor: rgb(0.2, 0.28, 0.42),
        borderWidth: 1,
        borderRadius: 10,
      });

      page.drawText(badgeText, {
        x: badgeX + badgePaddingX,
        y: badgeY + badgePaddingY + 2,
        size: badgeSize,
        font: fontBold,
        color: white,
      });
    };

    const drawSectionTitle = (page: any, x: number, y: number, title: string) => {
      page.drawText(title, { x, y, size: 12, font: fontBold, color: slate900 });
      page.drawRectangle({ x, y: y - 8, width: 38, height: 3, color: blue600, borderRadius: 2 });
    };

    const drawInfoCard = (page: any, x: number, y: number, width: number, label: string, value: string) => {
      page.drawRectangle({
        x,
        y,
        width,
        height: 44,
        color: slate100,
        borderColor: slate200,
        borderWidth: 1,
        borderRadius: 10,
      });
      page.drawText(label.toUpperCase(), { x: x + 12, y: y + 28, size: 8, font: fontBold, color: slate500 });
      page.drawText(value, { x: x + 12, y: y + 12, size: 10, font, color: slate900 });
    };

    const createPage = () => {
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      drawHeader(page, width, height);
      return { page, width, height, cursorY: height - headerHeight - 26 };
    };

    let ctx = createPage();
    const site = pickSingle(project.customer_sites);

    const contentWidth = ctx.width - pageMarginX * 2;
    const gap = 10;
    const cardWidth = (contentWidth - gap) / 2;

    const metaTopY = ctx.cursorY - 52;
    drawInfoCard(ctx.page, pageMarginX, metaTopY, cardWidth, 'Proyecto', truncateMiddle(projectId, 44));
    drawInfoCard(ctx.page, pageMarginX + cardWidth + gap, metaTopY, cardWidth, 'Sitio', safeText(site?.name, 'Sitio'));

    const metaRow2Y = metaTopY - 54;
    drawInfoCard(ctx.page, pageMarginX, metaRow2Y, cardWidth, 'Fecha', formatDateTime(deliveredAtIso));
    drawInfoCard(ctx.page, pageMarginX + cardWidth + gap, metaRow2Y, cardWidth, 'Total dispositivos', String(devicesSnapshot.length));

    ctx.cursorY = metaRow2Y - 34;

    drawSectionTitle(ctx.page, pageMarginX, ctx.cursorY, 'Dispositivos instalados');
    ctx.cursorY -= 22;

    const tableX = pageMarginX;
    const tableWidth = contentWidth;
    const colName = Math.floor(tableWidth * 0.38);
    const colZone = Math.floor(tableWidth * 0.16);
    const colSerial = Math.floor(tableWidth * 0.2);
    const colMac = tableWidth - colName - colZone - colSerial;
    const headerRowHeight = 24;
    const rowHeight = 28;

    const drawTableHeader = (title: string | null) => {
      if (title) {
        drawSectionTitle(ctx.page, pageMarginX, ctx.cursorY, title);
        ctx.cursorY -= 22;
      }

      ctx.page.drawRectangle({
        x: tableX,
        y: ctx.cursorY - headerRowHeight,
        width: tableWidth,
        height: headerRowHeight,
        color: slate100,
        borderColor: slate200,
        borderWidth: 1,
        borderRadius: 8,
      });
      const headerY = ctx.cursorY - 16;
      ctx.page.drawText('Dispositivo', { x: tableX + 12, y: headerY, size: 9, font: fontBold, color: slate700 });
      ctx.page.drawText('Zona', { x: tableX + 12 + colName, y: headerY, size: 9, font: fontBold, color: slate700 });
      ctx.page.drawText('Serial', { x: tableX + 12 + colName + colZone, y: headerY, size: 9, font: fontBold, color: slate700 });
      ctx.page.drawText('MAC', { x: tableX + 12 + colName + colZone + colSerial, y: headerY, size: 9, font: fontBold, color: slate700 });
      ctx.cursorY -= headerRowHeight;
    };

    const ensureSpace = (neededHeight: number) => {
      if (ctx.cursorY - neededHeight > pageMarginBottom) return;
      ctx = createPage();
      drawTableHeader('Dispositivos instalados (continuación)');
    };

    drawTableHeader(null);

    for (const device of devicesSnapshot) {
      ensureSpace(rowHeight + 10);

      ctx.page.drawRectangle({
        x: tableX,
        y: ctx.cursorY - rowHeight,
        width: tableWidth,
        height: rowHeight,
        borderColor: slate200,
        borderWidth: 1,
        borderRadius: 8,
      });

      const nameText = `${device.name}${device.model ? ` (${device.model})` : ''}`;
      const nameLines = wrapText(nameText, colName - 18, 9, true).slice(0, 2);
      const textY = ctx.cursorY - 18;

      ctx.page.drawText(nameLines[0] ?? '-', { x: tableX + 12, y: textY, size: 9, font: fontBold, color: slate900 });
      if (nameLines.length > 1) {
        ctx.page.drawText(nameLines[1] ?? '', { x: tableX + 12, y: textY - 10, size: 8, font, color: slate700 });
      }

      ctx.page.drawText(device.zoneName ?? '-', { x: tableX + 12 + colName, y: textY, size: 9, font, color: slate700 });
      ctx.page.drawText(device.serial ?? '-', { x: tableX + 12 + colName + colZone, y: textY, size: 9, font, color: slate700 });
      ctx.page.drawText(device.mac ?? '-', { x: tableX + 12 + colName + colZone + colSerial, y: textY, size: 9, font, color: slate700 });

      ctx.cursorY -= rowHeight + 6;
    }

    if (warrantyTerms) {
      ensureSpace(150);
      drawSectionTitle(ctx.page, pageMarginX, ctx.cursorY, 'Garantía y condiciones');
      ctx.cursorY -= 18;

      const boxHeight = 110;
      const boxY = ctx.cursorY - boxHeight;
      ctx.page.drawRectangle({
        x: pageMarginX,
        y: boxY,
        width: contentWidth,
        height: boxHeight,
        color: slate100,
        borderColor: slate200,
        borderWidth: 1,
        borderRadius: 12,
      });

      const textX = pageMarginX + 14;
      let textY = boxY + boxHeight - 22;
      for (const chunk of chunkText(warrantyTerms, 140)) {
        const lines = wrapText(chunk, contentWidth - 28, 9, false);
        for (const line of lines) {
          if (textY < boxY + 14) break;
          ctx.page.drawText(line, { x: textX, y: textY, size: 9, font, color: slate700 });
          textY -= 12;
        }
        if (textY < boxY + 14) break;
      }

      ctx.cursorY = boxY - 16;
    }

    const pages = pdfDoc.getPages();
    pages.forEach((p: any, idx: number) => {
      const { width } = p.getSize();
      const footerText = `${companyName} · Acta #${actId.slice(0, 8)} · Página ${idx + 1} de ${pages.length}`;
      p.drawLine({
        start: { x: pageMarginX, y: pageMarginBottom + 18 },
        end: { x: width - pageMarginX, y: pageMarginBottom + 18 },
        thickness: 1,
        color: slate200,
      });
      p.drawText(footerText, { x: pageMarginX, y: pageMarginBottom + 4, size: 8, font, color: slate500 });
    });

    const pdfBytes = await pdfDoc.save();

    const { error: uploadError } = await adminClient.storage
      .from("delivery_acts")
      .upload(pdfPath, pdfBytes, { contentType: "application/pdf", upsert: true });

    if (uploadError) return jsonResponse(500, { error: uploadError.message || "No se pudo subir el PDF." });

    const { data: signed } = await adminClient.storage.from("delivery_acts").createSignedUrl(pdfPath, 60 * 60 * 24 * 7);
    const pdfUrl = signed?.signedUrl ?? null;

    const budget = pickSingle(project.budgets);
    const survey = pickSingle((budget as { site_surveys?: unknown } | null)?.site_surveys);
    const customer = pickSingle((survey as { customers?: unknown } | null)?.customers);
    const customerUser = pickSingle((customer as { users?: unknown } | null)?.users);
    const visit = pickSingle(project.technical_visits);
    const technician = pickSingle((visit as { users?: unknown } | null)?.users);

    const { error: insertError } = await adminClient.from("delivery_acts").insert({
      id: actId,
      company_id: companyId,
      project_id: projectId,
      customer_id: safeText(customerUser?.id, "") || null,
      technician_id: safeText(technician?.id, "") || null,
      status: "pending",
      pdf_path: pdfPath,
      pdf_url: pdfUrl,
      devices_snapshot: devicesSnapshot,
      credentials_snapshot: credentialsSnapshot,
      warranty_terms: warrantyTerms,
      delivered_at: deliveredAtIso,
      created_by: authData.user.id,
      created_at: deliveredAtIso,
      updated_at: deliveredAtIso,
    });

    if (insertError) return jsonResponse(400, { error: insertError.message || "No se pudo crear el acta." });

    const customerId = safeText(customerUser?.id, "") || null;
    let customerEmail: string | null = null;
    if (customerId) {
      const { data: authUser } = await adminClient.auth.admin.getUserById(customerId);
      customerEmail = authUser?.user?.email ?? null;
    }

    let emailSent = false;
    let warning: string | null = null;

    if (customerEmail) {
      const origin = req.headers.get("Origin") ?? req.headers.get("Referer") ?? "";
      const base = origin.replace(/\/$/, "");
      const actUrl = base ? base + "/acta/" + actId : undefined;
      const attachmentBase64 = bytesToBase64(pdfBytes);

      const html = `
        <div style="font-family: Inter, Arial, sans-serif; background:#f8fafc; padding:24px;">
          <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
            <div style="background:#0f172a;color:#fff;padding:20px 24px;">
              <h1 style="margin:0;font-size:18px;">Acta de entrega</h1>
              <p style="margin:6px 0 0;font-size:13px;color:#cbd5f5;">${companyName}</p>
            </div>
            <div style="padding:20px 24px;color:#0f172a;">
              <p style="margin:0 0 12px;font-size:14px;">Tu acta de entrega estÃ¡ lista para revisar y aceptar.</p>
              <div style="background:#f1f5f9;border-radius:12px;padding:14px;margin-bottom:14px;">
                <p style="margin:0 0 6px;font-size:13px;"><strong>Acta:</strong> ${actId.slice(0, 8)}</p>
                <p style="margin:0 0 6px;font-size:13px;"><strong>Proyecto:</strong> ${projectId}</p>
                <p style="margin:0;font-size:13px;"><strong>Fecha:</strong> ${formatDateTime(deliveredAtIso)}</p>
              </div>
              <a href="${actUrl ?? "#"}" style="display:inline-block;padding:10px 14px;border-radius:10px;background:#2563eb;color:#fff;text-decoration:none;font-size:13px;">Ver acta</a>
            </div>
            <div style="padding:14px 24px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
              Este correo fue generado automÃ¡ticamente.
            </div>
          </div>
        </div>
      `;

      try {
        const emailResponse = await fetch(supabaseUrl + "/functions/v1/send_email_notification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + userToken,
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({
            companyId,
            to: customerEmail,
            type: "transaction",
            eventKey: "delivery_act.created",
            templateKey: "delivery_act",
            entityType: "delivery_act",
            entityId: actId,
            subject: "Acta de entrega disponible",
            title: "Acta de entrega disponible",
            message: "Ya puedes revisar y aceptar el acta de entrega de tu instalaciÃ³n.",
            html,
            actionUrl: actUrl ?? pdfUrl ?? undefined,
            metadata: { actId, projectId },
            attachments: [
              {
                filename: "acta-entrega.pdf",
                contentBase64: attachmentBase64,
                contentType: "application/pdf",
              },
            ],
          }),
        });

        emailSent = emailResponse.ok;
        if (!emailResponse.ok) {
          warning = "El PDF fue generado pero el email no pudo enviarse.";
        }
      } catch {
        warning = "El PDF fue generado pero el email no pudo enviarse.";
      }
    } else {
      warning = "No hay email destino configurado. El PDF fue generado sin enviar email.";
    }

    return jsonResponse(200, { actId, pdfUrl, deliveredAt: deliveredAtIso, emailSent, warning });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse(500, { error: message });
  }
});
