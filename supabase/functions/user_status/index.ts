import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LIST_USERS_PAGE_SIZE = 200;
const STEP_TIMEOUT_MS = 20_000;
const BANNED_UNTIL_TARGET = new Date("2099-12-31T23:59:59.000Z");

type RequestPayload = {
  mode?: "list_company_users_status" | "set_user_disabled_state";
  companyId?: string;
  targetUserId?: string;
  disabled?: boolean;
};

type CallerRoleRow = {
  company_id: string;
  roles: { name: string } | Array<{ name: string }> | null;
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

function withTimeout<T>(step: string, promise: Promise<T>, requestId: string, ms = STEP_TIMEOUT_MS): Promise<T> {
  const startedAt = Date.now();
  return Promise.race([
    promise.then((result) => {
      console.log(`[user_status] request_id=${requestId} ok:${step} (${Date.now() - startedAt}ms)`);
      return result;
    }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Timeout:${step}`)), ms)),
  ]).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[user_status] request_id=${requestId} fail:${step} -> ${message}`);
    throw error;
  });
}

function isUserDisabled(bannedUntil: string | null | undefined): boolean {
  if (!bannedUntil) return false;

  const ts = Date.parse(bannedUntil);
  if (Number.isNaN(ts)) return false;

  return ts > Date.now();
}

function computeBanDurationHours(): number {
  const nowMs = Date.now();
  const targetMs = BANNED_UNTIL_TARGET.getTime();
  if (targetMs <= nowMs) return 1;

  return Math.max(1, Math.ceil((targetMs - nowMs) / (1000 * 60 * 60)));
}

async function listAllAuthUsers(
  adminClient: ReturnType<typeof createClient>,
  requestId: string
): Promise<Array<{ id: string; banned_until?: string | null }>> {
  const users: Array<{ id: string; banned_until?: string | null }> = [];
  let page = 1;

  while (true) {
    const { data, error } = await withTimeout(
      `auth.listUsers.page${page}`,
      adminClient.auth.admin.listUsers({ page, perPage: LIST_USERS_PAGE_SIZE }),
      requestId
    );

    if (error) {
      throw new Error(error.message || "No se pudo listar usuarios de Auth.");
    }

    const pageUsers = data.users ?? [];
    users.push(...pageUsers.map((user) => ({ id: user.id, banned_until: user.banned_until })));

    if (pageUsers.length < LIST_USERS_PAGE_SIZE) break;
    page += 1;

    if (page > 100) {
      throw new Error("Se alcanzo el limite de paginacion listando usuarios de Auth.");
    }
  }

  return users;
}

Deno.serve(async (req: Request) => {
  try {
    const requestId = crypto.randomUUID();
    console.log(`[user_status] request_id=${requestId} method=${req.method}`);

    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return jsonResponse(405, { error: "Method not allowed" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      console.error(`[user_status] request_id=${requestId} missing SUPABASE_URL/ANON/SERVICE_ROLE`);
      return jsonResponse(500, {
        error: "Missing SUPABASE_URL, SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY.",
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const accessToken = authHeader.replace("Bearer ", "").trim();
    if (!accessToken) {
      return jsonResponse(401, { error: "Missing authorization header" });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: authData, error: authError } = await withTimeout(
      "auth.getUser",
      authClient.auth.getUser(accessToken),
      requestId
    );
    if (authError || !authData.user) {
      return jsonResponse(401, { error: "Invalid access token" });
    }

    const payload = (await req.json().catch(() => ({}))) as RequestPayload;
    const mode = payload.mode;
    const companyId = payload.companyId?.trim();

    if (!mode) {
      return jsonResponse(400, { error: "mode es requerido." });
    }

    if (!companyId) {
      return jsonResponse(400, { error: "companyId es requerido." });
    }

    const callerUserId = authData.user.id;

    const { data: callerRoles, error: callerRolesError } = await withTimeout(
      "db.fetchCallerRoles",
      adminClient
        .from("user_roles")
        .select("company_id, roles(name)")
        .eq("user_id", callerUserId)
        .eq("company_id", companyId),
      requestId
    );
    if (callerRolesError) {
      return jsonResponse(400, { error: callerRolesError.message });
    }

    const isAdmin = ((callerRoles ?? []) as CallerRoleRow[]).some((row) => {
      if (!row.roles) return false;
      if (Array.isArray(row.roles)) return row.roles.some((role) => role.name === "admin");
      return row.roles.name === "admin";
    });

    if (!isAdmin) {
      return jsonResponse(403, { error: "Solo un admin de la compania puede gestionar usuarios." });
    }

    if (mode === "list_company_users_status") {
      const { data: rows, error: rowsError } = await withTimeout(
        "db.fetchCompanyUsers",
        adminClient
          .from("user_roles")
          .select("user_id")
          .eq("company_id", companyId),
        requestId
      );

      if (rowsError) {
        return jsonResponse(400, { error: rowsError.message });
      }

      const userIds = Array.from(
        new Set(
          (rows ?? [])
            .map((row) => (row as { user_id?: string | null }).user_id)
            .filter((value): value is string => typeof value === "string" && value.length > 0)
        )
      );

      if (userIds.length === 0) {
        return jsonResponse(200, { statuses: [] });
      }

      const authUsers = await listAllAuthUsers(adminClient, requestId);
      const authUserById = new Map(authUsers.map((user) => [user.id, user]));

      const statuses = userIds.map((userId) => {
        const authUser = authUserById.get(userId);
        const bannedUntil = authUser?.banned_until ?? null;

        return {
          userId,
          bannedUntil,
          isDisabled: isUserDisabled(bannedUntil),
        };
      });

      return jsonResponse(200, { statuses });
    }

    if (mode === "set_user_disabled_state") {
      const targetUserId = payload.targetUserId?.trim();
      if (!targetUserId) {
        return jsonResponse(400, { error: "targetUserId es requerido." });
      }

      if (typeof payload.disabled !== "boolean") {
        return jsonResponse(400, { error: "disabled (boolean) es requerido." });
      }

      if (payload.disabled && targetUserId === callerUserId) {
        return jsonResponse(400, { error: "No puedes deshabilitar tu propio usuario." });
      }

      const { data: targetRow, error: targetRowError } = await withTimeout(
        "db.validateTargetUser",
        adminClient
          .from("user_roles")
          .select("user_id")
          .eq("company_id", companyId)
          .eq("user_id", targetUserId)
          .maybeSingle<{ user_id: string }>(),
        requestId
      );

      if (targetRowError) {
        return jsonResponse(400, { error: targetRowError.message });
      }

      if (!targetRow?.user_id) {
        return jsonResponse(404, { error: "El usuario no pertenece a la compania indicada." });
      }

      const banDuration = payload.disabled ? `${computeBanDurationHours()}h` : "none";

      const { data: updatedUserData, error: updateError } = await withTimeout(
        "auth.updateUserById",
        adminClient.auth.admin.updateUserById(targetUserId, {
          ban_duration: banDuration,
        }),
        requestId
      );

      if (updateError) {
        return jsonResponse(400, { error: updateError.message });
      }

      const bannedUntil = updatedUserData.user?.banned_until ?? null;

      return jsonResponse(200, {
        status: {
          userId: targetUserId,
          bannedUntil,
          isDisabled: isUserDisabled(bannedUntil),
        },
      });
    }

    return jsonResponse(400, { error: "mode invalido." });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Timeout:")) {
      const step = error.message.replace("Timeout:", "");
      return jsonResponse(504, { error: `Timeout en ${step}. Revisa logs de la function.` });
    }

    console.error("[user_status] unhandled_error", error);
    return jsonResponse(500, { error: error instanceof Error ? error.message : "Unhandled error" });
  }
});
