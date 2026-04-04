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
        zones:zone_id ( id, name )
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

    const devicesSnapshot: DeviceSnapshot[] = installedRows.map((row) => {
      const device = pickSingle((row as { devices?: unknown }).devices as unknown);
      const brand = pickSingle((device as { brands?: unknown } | null)?.brands ?? null);
      const zone = pickSingle((row as { zones?: unknown }).zones as unknown);
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

    const actId = crypto.randomUUID();
    const deliveredAtIso = new Date().toISOString();
    const pdfPath = `${companyId}/projects/${projectId}/delivery-acts/${actId}.pdf`;

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageMargin = 48;
    const lineHeight = 14;
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    let y = height - pageMargin;

    const drawLine = (text: string, bold = false, size = 11, color = rgb(0.05, 0.09, 0.16)) => {
      page.drawText(text, {
        x: pageMargin,
        y,
        size,
        font: bold ? fontBold : font,
        color,
      });
      y -= lineHeight;
    };

    drawLine("ACTA DE ENTREGA", true, 16, rgb(0.06, 0.09, 0.16));
    drawLine(`Acta #${actId.slice(0, 8)}`, false, 11, rgb(0.25, 0.33, 0.45));
    y -= 10;

    const site = pickSingle(project.customer_sites);
    drawLine(`Proyecto: ${projectId}`, true);
    drawLine(`Sitio: ${safeText(site?.name, "Sitio")}`);
    drawLine(`Fecha: ${formatDateTime(deliveredAtIso)}`);
    y -= 8;

    drawLine("Dispositivos instalados", true, 12);
    y -= 4;

    const ensureSpace = (needed: number) => {
      if (y - needed > pageMargin) return;
      page = pdfDoc.addPage();
      y = page.getSize().height - pageMargin;
    };

    for (const device of devicesSnapshot) {
      ensureSpace(6 * lineHeight);
      drawLine(`${device.name}${device.model ? ` (${device.model})` : ""}`, true);
      drawLine(`Zona: ${device.zoneName ?? "-"}`);
      drawLine(`Serial: ${device.serial ?? "-"}  |  MAC: ${device.mac ?? "-"}`);
      y -= 4;
    }

    if (warrantyTerms) {
      ensureSpace(10 * lineHeight);
      drawLine("Garantía y condiciones", true, 12);
      y -= 4;
      for (const chunk of chunkText(warrantyTerms, 95)) {
        ensureSpace(2 * lineHeight);
        drawLine(chunk, false, 10, rgb(0.25, 0.33, 0.45));
      }
    }

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

    return jsonResponse(200, { actId, pdfUrl, deliveredAt: deliveredAtIso });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse(500, { error: message });
  }
});

