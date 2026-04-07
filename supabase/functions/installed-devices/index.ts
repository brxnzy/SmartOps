import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-jwt",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type InstalledDeviceStatus = "active" | "maintenance" | "retired";

type CreateInstalledDevicePayload = {
  companyId: string;
  projectId: string;
  siteId: string;
  zoneId: string;
  catalogDeviceId: string;
  serial?: string | null;
  mac?: string | null;
  firmware?: string | null;
  locationDetail?: string | null;
  installedAt?: string | null;
  installedBy?: string | null;
  status?: InstalledDeviceStatus | null;
};

type UpdateInstalledDevicePayload = {
  companyId: string;
  id: string;
  patch: Partial<{
    zoneId: string;
    catalogDeviceId: string;
    serial: string | null;
    mac: string | null;
    firmware: string | null;
    locationDetail: string | null;
    installedAt: string | null;
    installedBy: string | null;
    status: InstalledDeviceStatus;
  }>;
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

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(500, { error: "Missing Supabase env vars" });
  }

  const bearerToken = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  const userToken = (req.headers.get("x-user-jwt") ?? "").trim() || bearerToken;
  if (!userToken) {
    return jsonResponse(401, { error: "Missing user jwt" });
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(userToken);
  if (authError || !authData.user) {
    return jsonResponse(401, { error: "Invalid access token" });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const companyId = safeText(url.searchParams.get("companyId"), "");
      const projectId = safeText(url.searchParams.get("projectId"), "");
      if (!companyId || !projectId) {
        return jsonResponse(400, { error: "companyId y projectId son requeridos" });
      }

      const { data, error } = await userClient
        .from("installed_devices")
        .select(
          `
          id,
          company_id,
          project_id,
          site_id,
          zone_id,
          catalog_device_id,
          serial,
          mac,
          firmware,
          location_detail,
          installed_at,
          installed_by,
          status,
          created_at,
          updated_at
          `
        )
        .eq("company_id", companyId)
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("installed_at", { ascending: false });

      if (error) {
        return jsonResponse(400, { error: error.message });
      }

      return jsonResponse(200, { devices: data ?? [] });
    }

    if (req.method !== "POST") {
      return jsonResponse(405, { error: "Method not allowed" });
    }

    const body = (await req.json().catch(() => null)) as
      | { op: "create"; payload: CreateInstalledDevicePayload }
      | { op: "update"; payload: UpdateInstalledDevicePayload }
      | { op: "softDelete"; payload: { companyId: string; id: string } }
      | null;

    if (!body?.op) {
      return jsonResponse(400, { error: "op es requerido" });
    }

    if (body.op === "create") {
      const payload = body.payload;
      const companyId = safeText(payload?.companyId, "");
      const projectId = safeText(payload?.projectId, "");
      const siteId = safeText(payload?.siteId, "");
      const zoneId = safeText(payload?.zoneId, "");
      const catalogDeviceId = safeText(payload?.catalogDeviceId, "");

      if (!companyId || !projectId || !siteId || !zoneId || !catalogDeviceId) {
        return jsonResponse(400, { error: "companyId, projectId, siteId, zoneId y catalogDeviceId son requeridos" });
      }

      const installedBy = trimOrNull(payload.installedBy) ?? authData.user.id;
      const installedAt = trimOrNull(payload.installedAt);
      const status = (payload.status ?? "active") as InstalledDeviceStatus;

      const { data, error } = await userClient
        .from("installed_devices")
        .insert({
          company_id: companyId,
          project_id: projectId,
          site_id: siteId,
          zone_id: zoneId,
          catalog_device_id: catalogDeviceId,
          serial: trimOrNull(payload.serial),
          mac: trimOrNull(payload.mac),
          firmware: trimOrNull(payload.firmware),
          location_detail: trimOrNull(payload.locationDetail),
          installed_at: installedAt ?? undefined,
          installed_by: installedBy,
          status,
        })
        .select("id")
        .single();

      if (error) {
        const message = error.message || "No se pudo crear el dispositivo instalado.";
        const statusCode = message.toLowerCase().includes("duplicate") ? 409 : 400;
        return jsonResponse(statusCode, { error: message });
      }

      return jsonResponse(200, { id: data?.id });
    }

    if (body.op === "update") {
      const payload = body.payload;
      const companyId = safeText(payload?.companyId, "");
      const id = safeText(payload?.id, "");
      if (!companyId || !id) {
        return jsonResponse(400, { error: "companyId e id son requeridos" });
      }

      const patch = payload.patch ?? {};
      const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (patch.zoneId) updatePayload.zone_id = patch.zoneId;
      if (patch.catalogDeviceId) updatePayload.catalog_device_id = patch.catalogDeviceId;
      if ("serial" in patch) updatePayload.serial = trimOrNull(patch.serial);
      if ("mac" in patch) updatePayload.mac = trimOrNull(patch.mac);
      if ("firmware" in patch) updatePayload.firmware = trimOrNull(patch.firmware);
      if ("locationDetail" in patch) updatePayload.location_detail = trimOrNull(patch.locationDetail);
      if ("installedAt" in patch) updatePayload.installed_at = trimOrNull(patch.installedAt);
      if ("installedBy" in patch) updatePayload.installed_by = trimOrNull(patch.installedBy);
      if ("status" in patch && patch.status) updatePayload.status = patch.status;

      const { error } = await userClient
        .from("installed_devices")
        .update(updatePayload)
        .eq("company_id", companyId)
        .eq("id", id)
        .is("deleted_at", null);

      if (error) {
        const message = error.message || "No se pudo actualizar el dispositivo instalado.";
        const statusCode = message.toLowerCase().includes("duplicate") ? 409 : 400;
        return jsonResponse(statusCode, { error: message });
      }

      return jsonResponse(200, { ok: true });
    }

    if (body.op === "softDelete") {
      const companyId = safeText(body.payload?.companyId, "");
      const id = safeText(body.payload?.id, "");
      if (!companyId || !id) {
        return jsonResponse(400, { error: "companyId e id son requeridos" });
      }

      const now = new Date().toISOString();
      const { error } = await userClient
        .from("installed_devices")
        .update({
          deleted_at: now,
          deleted_by: authData.user.id,
          updated_at: now,
        })
        .eq("company_id", companyId)
        .eq("id", id)
        .is("deleted_at", null);

      if (error) {
        return jsonResponse(400, { error: error.message || "No se pudo eliminar el dispositivo instalado." });
      }

      return jsonResponse(200, { ok: true });
    }

    return jsonResponse(400, { error: "op invalido" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse(500, { error: message });
  }
});

