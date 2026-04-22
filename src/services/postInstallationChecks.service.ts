import { supabase } from "../libs/supabase";
import { logAuditEvent } from "./audit.service";

export interface PostInstallationChecklist {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
}

export interface PostInstallationChecklistItem {
  id: string;
  checklistId: string;
  text: string;
  itemOrder: number;
  isActive: boolean;
}

function safeText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function safeNullableText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return safeText(value, "");
}

function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function safeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
}

export async function getOrCreatePostInstallationChecklist(companyId: string): Promise<PostInstallationChecklist> {
  const { error: ensureError } = await supabase.rpc("ensure_post_installation_checklist", {
    p_company_id: companyId,
  });

  if (ensureError) {
    throw new Error(ensureError.message || "No se pudo preparar las pruebas post instalacion.");
  }

  const { data, error } = await supabase
    .from("post_installation_checks")
    .select("id, company_id, name, description")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message || "No se pudo cargar la configuracion de pruebas post instalacion.");
  }

  return {
    id: safeText(data.id),
    companyId: safeText(data.company_id),
    name: safeText(data.name, "Pruebas post instalacion"),
    description: safeNullableText(data.description),
  };
}

export async function listPostInstallationChecklistItems(checklistId: string): Promise<PostInstallationChecklistItem[]> {
  const { data, error } = await supabase
    .from("post_installation_check_items")
    .select("id, checklist_id, text, item_order, is_active")
    .eq("checklist_id", checklistId)
    .eq("is_active", true)
    .order("item_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message || "No se pudieron cargar los items.");
  }

  return (data ?? []).map((row) => ({
    id: safeText(row.id),
    checklistId: safeText(row.checklist_id),
    text: safeText(row.text),
    itemOrder: safeNumber(row.item_order, 0),
    isActive: safeBoolean(row.is_active),
  }));
}

export async function updatePostInstallationChecklist(input: {
  checklistId: string;
  companyId: string;
  name: string;
  description: string | null;
}): Promise<void> {
  const payload = {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("post_installation_checks")
    .update(payload)
    .eq("id", input.checklistId)
    .eq("company_id", input.companyId);

  if (error) {
    throw new Error(error.message || "No se pudo actualizar la configuracion.");
  }

  await logAuditEvent({
    action: "update",
    entity: "post_installation_checks",
    entityId: input.checklistId,
    companyId: input.companyId,
    newValues: payload,
  });
}

export async function createPostInstallationChecklistItem(input: {
  checklistId: string;
  companyId: string;
  text: string;
}): Promise<void> {
  const { data: maxOrderData } = await supabase
    .from("post_installation_check_items")
    .select("item_order")
    .eq("checklist_id", input.checklistId)
    .order("item_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ item_order: number | null }>();

  const nextOrder = ((maxOrderData?.item_order ?? -1) + 1);

  const payload = {
    checklist_id: input.checklistId,
    text: input.text.trim(),
    item_order: nextOrder,
    is_active: true,
  };

  const { data, error } = await supabase
    .from("post_installation_check_items")
    .insert(payload)
    .select("id")
    .single<{ id: string }>();

  if (error) {
    throw new Error(error.message || "No se pudo crear el item.");
  }

  await logAuditEvent({
    action: "create",
    entity: "post_installation_check_items",
    entityId: data.id,
    companyId: input.companyId,
    newValues: payload,
  });
}

export async function updatePostInstallationChecklistItem(input: {
  itemId: string;
  companyId: string;
  text: string;
}): Promise<void> {
  const payload = {
    text: input.text.trim(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("post_installation_check_items")
    .update(payload)
    .eq("id", input.itemId);

  if (error) {
    throw new Error(error.message || "No se pudo actualizar el item.");
  }

  await logAuditEvent({
    action: "update",
    entity: "post_installation_check_items",
    entityId: input.itemId,
    companyId: input.companyId,
    newValues: payload,
  });
}

export async function deletePostInstallationChecklistItem(input: {
  itemId: string;
  companyId: string;
}): Promise<void> {
  const payload = {
    is_active: false,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("post_installation_check_items")
    .update(payload)
    .eq("id", input.itemId);

  if (error) {
    throw new Error(error.message || "No se pudo eliminar el item.");
  }

  await logAuditEvent({
    action: "delete",
    entity: "post_installation_check_items",
    entityId: input.itemId,
    companyId: input.companyId,
    newValues: payload,
  });
}
