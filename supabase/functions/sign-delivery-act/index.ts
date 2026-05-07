import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

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

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function decodeBase64Image(input: string): { bytes: Uint8Array; contentType: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^data:(image\/\w+);base64,(.+)$/);
  const contentType = match?.[1] ?? "image/png";
  const base64 = match?.[2] ?? trimmed;

  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return { bytes, contentType };
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();

  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      console.log(`[sign-delivery-act] request_id=${requestId} method=${req.method}`);
      return jsonResponse(405, { error: "Method not allowed" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return jsonResponse(500, { error: "Missing SUPABASE_URL/ANON/SERVICE_ROLE keys." });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const bearerToken = authHeader.replace("Bearer ", "").trim();
    const userToken = (req.headers.get("x-user-jwt") ?? "").trim() || bearerToken;

    if (!userToken) {
      console.log(`[sign-delivery-act] request_id=${requestId} missing_user_jwt`);
      return jsonResponse(401, { error: "Missing user jwt" });
    }

    const { actId, signature } = (await req.json()) as { actId: string; signature?: string | null };
    if (!actId) {
      return jsonResponse(400, { error: "actId es requerido" });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authError } = await authClient.auth.getUser(userToken);
    console.log(`[sign-delivery-act] request_id=${requestId} auth_user=${authData?.user?.id ?? "none"}`);

    if (authError || !authData.user) {
      return jsonResponse(401, { error: "Invalid access token" });
    }

    const { data: act, error: actError } = await adminClient
      .from("delivery_acts")
      .select("id, company_id, project_id, customer_id, status, pdf_path, pdf_url, devices_snapshot")
      .eq("id", actId)
      .maybeSingle();

    if (actError || !act) {
      console.log(`[sign-delivery-act] request_id=${requestId} act_error=${actError?.message ?? "not_found"}`);
      return jsonResponse(404, { error: actError?.message ?? "Acta no encontrada" });
    }

    console.log(
      `[sign-delivery-act] request_id=${requestId} act_loaded id=${act.id} company_id=${act.company_id} project_id=${act.project_id} status=${act.status}`
    );

    if (safeText(act.status, "pending") !== "pending") {
      console.log(`[sign-delivery-act] request_id=${requestId} invalid_status=${act.status}`);
      return jsonResponse(409, { error: "El acta ya fue firmada/aceptada." });
    }

    const companyId = safeText(act.company_id ?? "");
    const projectId = safeText(act.project_id ?? "");
    if (!companyId || !projectId) {
      return jsonResponse(400, { error: "Acta sin compania/proyecto." });
    }

    const isCustomer = safeText(act.customer_id ?? "") === authData.user.id;
    console.log(
      `[sign-delivery-act] request_id=${requestId} customer_check isCustomer=${isCustomer} customer_id=${act.customer_id ?? ""}`
    );

    if (!isCustomer) {
      console.log(`[sign-delivery-act] request_id=${requestId} forbidden_non_customer user_id=${authData.user.id} act_id=${actId}`);
      return jsonResponse(403, { error: "Solo el cliente puede firmar o aceptar el acta." });
    }

    const nowIso = new Date().toISOString();
    let signaturePath: string | null = null;
    let signatureType: string = "accepted";

    if (signature) {
      console.log(`[sign-delivery-act] request_id=${requestId} signature_received=true`);
      const parsed = decodeBase64Image(signature);
      if (!parsed) {
        return jsonResponse(400, { error: "Firma invalida." });
      }
      signatureType = "drawn";
      signaturePath = `${companyId}/${projectId}/signature-${actId}.png`;

      const { error: uploadError } = await adminClient.storage
        .from("delivery_acts")
        .upload(signaturePath, parsed.bytes, {
          contentType: parsed.contentType,
          upsert: true,
        });

      if (uploadError) {
        console.log(`[sign-delivery-act] request_id=${requestId} signature_upload_error=${uploadError.message}`);
        return jsonResponse(500, { error: uploadError.message });
      }
    }

    const status = signature ? "signed" : "accepted";

    const { error: updateError } = await adminClient
      .from("delivery_acts")
      .update({
        status,
        signed_at: nowIso,
        accepted_at: signature ? null : nowIso,
        signature_path: signaturePath,
        signature_type: signatureType,
        signed_by: authData.user.id,
        updated_at: nowIso,
      })
      .eq("id", actId);

    if (updateError) {
      console.log(`[sign-delivery-act] request_id=${requestId} update_error=${updateError.message}`);
      return jsonResponse(500, { error: updateError.message });
    }

    let projectFinalized = false;

    const { data: finalizeResult, error: finalizeError } = await adminClient
      .rpc("finalize_installation_project", {
        p_company_id: companyId,
        p_project_id: projectId,
        p_user_id: authData.user.id,
      })
      .single<{ already_finalized: boolean }>();

    if (!finalizeError) {
      projectFinalized = true;
    }

    if (finalizeError) {
      console.log(`[sign-delivery-act] request_id=${requestId} finalize_error=${finalizeError.message}`);
      const { error: fallbackError } = await adminClient
        .from("installation_projects")
        .update({ status: "terminado", completed_at: nowIso, updated_at: nowIso })
        .eq("id", projectId)
        .eq("company_id", companyId);

      if (fallbackError) {
        console.log(`[sign-delivery-act] request_id=${requestId} finalize_fallback_error=${fallbackError.message}`);
        return jsonResponse(500, { error: fallbackError.message });
      }
      projectFinalized = true;
    }

    const { data: settings } = await adminClient
      .from("delivery_act_settings")
      .select("warranty_months")
      .eq("company_id", companyId)
      .maybeSingle<DeliveryActSettingsRow>();

    const warrantyMonths = Math.max(0, settings?.warranty_months ?? 12);

    const { data: existingWarranty } = await adminClient
      .from("device_warranties")
      .select("id")
      .eq("project_id", projectId)
      .eq("company_id", companyId)
      .limit(1)
      .maybeSingle<{ id: string | null }>();

    if (!existingWarranty?.id) {
      const devicesSnapshot = (act.devices_snapshot ?? []) as DeviceSnapshot[];
      const startsAt = new Date(nowIso);
      const endsAt = warrantyMonths > 0 ? addMonths(startsAt, warrantyMonths) : null;

      const warrantyRows = devicesSnapshot.map((device) => ({
        company_id: companyId,
        project_id: projectId,
        device_id: device.deviceId,
        device_name: device.name,
        device_model: device.model,
        zone_name: device.zoneName,
        serial: device.serial,
        mac: device.mac,
        quantity: device.quantity ?? 1,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt ? endsAt.toISOString() : null,
        status: "active",
      }));

      if (warrantyRows.length > 0) {
        const { error: warrantyError } = await adminClient.from("device_warranties").insert(warrantyRows);
        if (warrantyError) {
          console.log(`[sign-delivery-act] request_id=${requestId} warranty_insert_error=${warrantyError.message}`);
        }
      }
    }

    let pdfUrl = safeText(act.pdf_url ?? "");
    if (!pdfUrl && act.pdf_path) {
      const { data: signed } = await adminClient.storage
        .from("delivery_acts")
        .createSignedUrl(act.pdf_path, 60 * 60 * 24 * 7);
      pdfUrl = signed?.signedUrl ?? "";
    }
    if (pdfUrl && !act.pdf_url) {
      await adminClient
        .from("delivery_acts")
        .update({ pdf_url: pdfUrl, updated_at: nowIso })
        .eq("id", actId);
    }

    let customerEmail: string | null = null;
    const customerId = safeText(act.customer_id ?? "");
    if (customerId) {
      const { data: authUser } = await adminClient.auth.admin.getUserById(customerId);
      customerEmail = authUser?.user?.email ?? null;
    }

    if (customerEmail) {
      const origin = req.headers.get("Origin") ?? "";
      const actUrl = origin ? `${origin.replace(/\/$/, "")}/acta/${actId}` : undefined;

      try {
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send_email_notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({
            to: customerEmail,
            type: "transaction",
            eventKey: "delivery_act.signed",
            templateKey: "delivery_act",
            entityType: "delivery_act",
            entityId: actId,
            subject: "Acta de entrega firmada",
            title: "Acta de entrega firmada",
            message: "Tu acta de entrega fue firmada y el proyecto se ha finalizado.",
            actionUrl: actUrl ?? (pdfUrl || undefined),
            metadata: {
              actId,
              projectId,
              status,
            },
          }),
        });

        const rawResponse = await emailResponse.text().catch(() => "");
        if (!emailResponse.ok) {
          console.log(
            `[sign-delivery-act] request_id=${requestId} send_email_notification_error status=${emailResponse.status} body=${rawResponse}`
          );
        }
      } catch (error) {
        console.log(`[sign-delivery-act] request_id=${requestId} email_error=${(error as Error)?.message ?? String(error)}`);
      }
    }

    let paymentAccountId: string | null = null;
    try {
      const paymentResponse = await fetch(`${supabaseUrl}/functions/v1/payments_actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceRoleKey,
          "x-internal-service-role": serviceRoleKey,
        },
        body: JSON.stringify({
          mode: "ensure_project_payment_account",
          projectId,
        }),
      });

      const rawResponse = await paymentResponse.text().catch(() => "");
      if (!paymentResponse.ok) {
        console.log(
          `[sign-delivery-act] request_id=${requestId} payment_ensure_error status=${paymentResponse.status} body=${rawResponse}`
        );
      } else {
        const parsed = rawResponse ? (JSON.parse(rawResponse) as { accountId?: string; error?: string }) : {};
        if (parsed.error) {
          console.log(`[sign-delivery-act] request_id=${requestId} payment_ensure_error=${parsed.error}`);
        } else {
          paymentAccountId = parsed.accountId ?? null;
        }
      }
    } catch (error) {
      console.log(
        `[sign-delivery-act] request_id=${requestId} payment_account_exception=${(error as Error)?.message ?? String(error)}`
      );
    }

    return jsonResponse(200, {
      actId,
      status,
      pdfUrl: pdfUrl || null,
      projectFinalized,
      paymentAccountId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[sign-delivery-act] request_id=${requestId} unhandled=${message}`);
    return jsonResponse(500, { error: message });
  }
});
