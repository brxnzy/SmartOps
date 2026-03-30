import { supabase } from "../libs/supabase";

export interface AuditLogInput {
  action: string;
  entity: string;
  entityId?: string | number | null;
  companyId?: string | null;
  userId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

export async function logAuditEvent({
  action,
  entity,
  entityId,
  companyId,
  userId,
  oldValues,
  newValues,
}: AuditLogInput): Promise<void> {
  try {
    const resolvedUserId = userId ?? (await supabase.auth.getUser()).data.user?.id ?? null;

    await supabase.from("audit_logs").insert({
      user_id: resolvedUserId,
      company_id: companyId ?? null,
      action,
      entity,
      entity_id: entityId ?? null,
      old_values: oldValues ?? null,
      new_values: newValues ?? null,
    });
  } catch (error) {
    console.error("[audit] failed to log event", error);
  }
}
