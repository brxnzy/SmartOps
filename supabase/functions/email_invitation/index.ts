import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import type { EmailInvitationPayload } from "../../types/interfaces";
import type { CallerRoleRow } from "../../types/interfaces";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};


const INVITE_TIMEOUT_MS = 120_000;
const STEP_TIMEOUT_MS = 20_000;

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
      console.log(`[email_invitation] request_id=${requestId} ok:${step} (${Date.now() - startedAt}ms)`);
      return result;
    }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Timeout:${step}`)), ms)),
  ]).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[email_invitation] request_id=${requestId} fail:${step} -> ${message}`);
    throw error;
  });
}

Deno.serve(async (req: Request) => {
  try {
    const requestId = crypto.randomUUID();
    console.log(`[email_invitation] request_id=${requestId} method=${req.method}`);

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
      console.error(`[email_invitation] request_id=${requestId} missing SUPABASE_URL/ANON/SERVICE_ROLE`);
      return jsonResponse(500, {
        error: "Missing SUPABASE_URL, SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY.",
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const accessToken = authHeader.replace("Bearer ", "").trim();
    if (!accessToken) {
      console.warn(`[email_invitation] request_id=${requestId} missing authorization header`);
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
      console.warn(
        `[email_invitation] request_id=${requestId} invalid auth token error=${authError?.message ?? "unknown"}`
      );
      return jsonResponse(401, { error: "Invalid access token" });
    }

    const {
      mode,
      email,
      redirectTo,
      customerId,
      companyId,
      invitedByUserId,
      customerName,
      customerIdCard,
      customerType,
      customerTaxId,
      customerPhone,
      userName,
      userIdCard,
      roleId,
      authUserId,
    } =
      (await req.json()) as EmailInvitationPayload;

    console.log(
      `[email_invitation] request_id=${requestId} payload email=${email} customerId=${customerId} companyId=${companyId}`
    );

    if (!companyId || !invitedByUserId) {
      return jsonResponse(400, {
        error: "companyId and invitedByUserId are required.",
      });
    }

    const callerUserId = authData.user.id;
    if (callerUserId !== invitedByUserId) {
      return jsonResponse(403, { error: "El usuario autenticado no coincide con invitedByUserId." });
    }

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
      return jsonResponse(403, { error: "Solo un admin de la compania puede enviar invitaciones." });
    }

    if (mode === "rollback_auth_user") {
      if (!authUserId) {
        return jsonResponse(400, { error: "authUserId es requerido para rollback." });
      }

      const { error: deleteError } = await withTimeout(
        "auth.deleteUser",
        adminClient.auth.admin.deleteUser(authUserId),
        requestId
      );

      if (deleteError) {
        return jsonResponse(400, { error: deleteError.message });
      }

      return jsonResponse(200, { success: true });
    }

    if (!email || !redirectTo) {
      return jsonResponse(400, {
        error: "email y redirectTo son requeridos.",
      });
    }

    const isInviteNewCustomer = mode === "invite_new_customer";
    const isInviteNewUser = mode === "invite_new_user";

    let customerResolvedName = customerName ?? "";
    let customerResolvedIdCard: string | null = customerIdCard ?? null;
    let customerResolvedType = "hogar";
    let customerResolvedTaxId: string | null = null;
    let customerResolvedPhone: string | null = null;

    if (!isInviteNewCustomer && !isInviteNewUser) {
      if (!customerId) {
        return jsonResponse(400, { error: "customerId es requerido para invitar cliente existente." });
      }

      const { data: customerData, error: customerError } = await withTimeout(
        "db.fetchCustomer",
        adminClient
          .from("customers")
          .select("user_id, phone, tax_id, type, users:user_id!inner(name, id_card)")
          .eq("user_id", customerId)
          .maybeSingle<{
            user_id: string;
            phone: string | null;
            tax_id: string | null;
            type: string;
            users: {
              name: string;
              id_card: string | null;
            } | null;
          }>(),
        requestId
      );
      if (customerError || !customerData) {
        return jsonResponse(400, { error: customerError?.message || "Customer not found." });
      }

      customerResolvedName = customerData.users?.name ?? "";
      customerResolvedIdCard = customerData.users?.id_card ?? null;
      customerResolvedType = customerData.type;
      customerResolvedTaxId = customerData.tax_id ?? null;
      customerResolvedPhone = customerData.phone ?? null;
    }

    if (isInviteNewUser) {
      customerResolvedName = userName?.trim() ?? "";
      customerResolvedIdCard = userIdCard ?? null;
      customerResolvedType = "internal";
      customerResolvedTaxId = null;
      customerResolvedPhone = null;

      if (!customerResolvedName) {
        return jsonResponse(400, { error: "userName es requerido para invitar un usuario interno." });
      }

      if (!roleId) {
        return jsonResponse(400, { error: "roleId es requerido para invitar un usuario interno." });
      }
    }

    const { data: companyData, error: companyError } = await withTimeout(
      "db.fetchCompany",
      adminClient
        .from("companies")
        .select("id, name, address, phone, rnc")
        .eq("id", companyId)
        .maybeSingle<{
          id: string;
          name: string;
          address: string | null;
          phone: string | null;
          rnc: string | null;
        }>(),
      requestId
    );
    if (companyError || !companyData) {
      return jsonResponse(400, { error: companyError?.message || "Company not found." });
    }

    const metadata = {
      name: customerResolvedName,
      idCard: customerResolvedIdCard ?? "",
      customer_id: customerId ?? "",
      customer_type: customerResolvedType,
      customer_tax_id: customerResolvedTaxId ?? "",
      customer_phone: customerResolvedPhone ?? "",
      company_id: companyId,
      company_name: companyData.name ?? "",
      company_address: companyData.address ?? "",
      company_phone: companyData.phone ?? "",
      company_rnc: companyData.rnc ?? "",
      invited_by_user_id: invitedByUserId,
      invited_customer: true,
    };

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString();
    const auditTokenHash = crypto.randomUUID().replaceAll("-", "");

    const normalizedEmail = email.trim().toLowerCase();
    const { data: inviteData, error: inviteError } = await withTimeout(
      "auth.inviteUserByEmail",
      adminClient.auth.admin.inviteUserByEmail(normalizedEmail, {
        redirectTo,
        data: metadata,
      }),
      requestId,
      INVITE_TIMEOUT_MS
    );

    if (inviteError) {
      const message = inviteError.message.toLowerCase();
      if (message.includes("already registered") || message.includes("already been invited")) {
        if (isInviteNewCustomer || isInviteNewUser) {
          return jsonResponse(409, {
            error: "El correo ya esta registrado o ya tiene una invitacion activa.",
          });
        }

        console.warn(
          `[email_invitation] request_id=${requestId} already_invited_or_registered email=${normalizedEmail}`
        );
        return jsonResponse(200, {
          success: true,
          warning: "El correo ya estaba registrado o ya tenia invitacion activa.",
        });
      }
      return jsonResponse(400, { error: inviteError.message });
    }

    if (isInviteNewUser) {
      const createdAuthUserId = inviteData.user?.id;
      if (!createdAuthUserId) {
        return jsonResponse(500, { error: "No se recibio user.id al invitar." });
      }

      try {
        const { data: roleData, error: roleError } = await withTimeout(
          "db.fetchRole",
          adminClient
            .from("roles")
            .select("id, name, company_id")
            .eq("id", roleId!)
            .maybeSingle<{ id: string; name: string; company_id: string | null }>(),
          requestId
        );

        if (roleError || !roleData?.id) {
          throw new Error(roleError?.message || "No se encontro el rol indicado.");
        }

        if (roleData.company_id && roleData.company_id !== companyId) {
          throw new Error("El rol no pertenece a la compania seleccionada.");
        }

        const { error: userInsertError } = await withTimeout(
          "db.insertUser",
          adminClient.from("users").insert({
            id: createdAuthUserId,
            name: customerResolvedName,
            id_card: customerResolvedIdCard ?? null,
          }),
          requestId
        );
        if (userInsertError) throw new Error(userInsertError.message);

        const { data: insertedUserRole, error: roleInsertError } = await withTimeout(
          "db.insertUserRole",
          adminClient
            .from("user_roles")
            .insert({
              user_id: createdAuthUserId,
              role_id: roleData.id,
              company_id: companyId,
            })
            .select("id")
            .single<{ id: string }>(),
          requestId
        );
        if (roleInsertError) throw new Error(roleInsertError.message);

        return jsonResponse(200, {
          success: true,
          authUserId: createdAuthUserId,
          user: {
            id: createdAuthUserId,
            userRoleId: insertedUserRole.id,
            companyId,
            name: customerResolvedName,
            idCard: customerResolvedIdCard ?? null,
            roleId: roleData.id,
            roleName: roleData.name,
            createdAt: new Date().toISOString(),
          },
        });
      } catch (createError) {
        await withTimeout("auth.deleteUser.rollback", adminClient.auth.admin.deleteUser(createdAuthUserId), requestId);
        throw createError;
      }
    }

    if (isInviteNewCustomer) {
      const createdAuthUserId = inviteData.user?.id;
      if (!createdAuthUserId) {
        return jsonResponse(500, { error: "No se recibio user.id al invitar." });
      }

      try {
        const { data: customerRoleData, error: customerRoleError } = await withTimeout(
          "db.fetchCustomerRole",
          adminClient.from("roles").select("id").eq("name", "customer").maybeSingle<{ id: string }>(),
          requestId
        );

        if (customerRoleError || !customerRoleData?.id) {
          throw new Error(customerRoleError?.message || "No se encontro el rol customer.");
        }

        const { error: userInsertError } = await withTimeout(
          "db.insertUser",
          adminClient.from("users").insert({
            id: createdAuthUserId,
            name: customerResolvedName,
            id_card: customerResolvedIdCard ?? null,
          }),
          requestId
        );
        if (userInsertError) throw new Error(userInsertError.message);

        const { error: customerInsertError } = await withTimeout(
          "db.insertCustomer",
          adminClient.from("customers").insert({
            user_id: createdAuthUserId,
            phone: customerPhone ?? null,
            tax_id: customerTaxId ?? "NO_APLICA",
            type: customerType ?? "hogar",
          }),
          requestId
        );
        if (customerInsertError) throw new Error(customerInsertError.message);

        const { error: roleInsertError } = await withTimeout(
          "db.insertCustomerRole",
          adminClient.from("user_roles").insert({
            user_id: createdAuthUserId,
            role_id: customerRoleData.id,
            company_id: companyId,
          }),
          requestId
        );
        if (roleInsertError) throw new Error(roleInsertError.message);

        return jsonResponse(200, {
          success: true,
          authUserId: createdAuthUserId,
          customer: {
            id: createdAuthUserId,
            companyId,
            name: customerResolvedName,
            idCard: customerResolvedIdCard ?? null,
            phone: customerPhone ?? null,
            taxId: customerTaxId ?? "NO_APLICA",
            type: customerType ?? "hogar",
            createdAt: new Date().toISOString(),
          },
        });
      } catch (createError) {
        await withTimeout("auth.deleteUser.rollback", adminClient.auth.admin.deleteUser(createdAuthUserId), requestId);
        throw createError;
      }
    }

    if (customerId) {
      const { error: auditError } = await adminClient
        .from("customer_invitations")
        .insert({
          customer_id: customerId,
          company_id: companyId,
          email: normalizedEmail,
          token_hash: auditTokenHash,
          invited_by: callerUserId,
          expires_at: expiresAt,
        });

      if (auditError) {
        console.warn(
          `[email_invitation] request_id=${requestId} audit_insert_error=${auditError.message}`
        );
      }
    }

    console.log(`[email_invitation] request_id=${requestId} invite_sent_ok email=${email}`);
    return jsonResponse(200, {
      success: true,
      authUserId: inviteData.user?.id ?? null,
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Timeout:")) {
      const step = error.message.replace("Timeout:", "");
      return jsonResponse(504, { error: `Timeout en ${step}. Revisa logs de la function.` });
    }
    console.error("[email_invitation] unhandled_error", error);
    return jsonResponse(500, { error: error instanceof Error ? error.message : "Unhandled error" });
  }
});
