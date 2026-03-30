import { supabase } from "../libs/supabase";
import type {
  ChecklistItem,
  ChecklistTemplate,
  CreateChecklistItemPayload,
  CreateChecklistTemplatePayload,
  UpdateChecklistItemPayload,
  UpdateChecklistTemplatePayload,
} from "../types/Checklist";
import type { ChecklistItemRow, ChecklistTemplateRow } from "../types/types";

function mapChecklistTemplate(row: ChecklistTemplateRow): ChecklistTemplate {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapChecklistItem(row: ChecklistItemRow): ChecklistItem {
  return {
    id: row.id,
    templateId: row.template_id,
    text: row.text,
    itemOrder: row.item_order ?? 0,
    createdAt: row.created_at,
  };
}

export async function getChecklistTemplatesByCompany(
  companyId: string | null
): Promise<ChecklistTemplate[]> {
  if (!companyId) return [];

  const { data, error } = await supabase
    .from("checklist_templates")
    .select("id, company_id, name, description, created_at, updated_at")
    .eq("company_id", companyId)
    .order("name", { ascending: true })
    .returns<ChecklistTemplateRow[]>();

  if (error) throw error;

  return (data ?? []).map(mapChecklistTemplate);
}

export async function createChecklistTemplate(
  payload: CreateChecklistTemplatePayload
): Promise<ChecklistTemplate> {
  const { data, error } = await supabase
    .from("checklist_templates")
    .insert({
      company_id: payload.companyId,
      name: payload.name,
      description: payload.description,
    })
    .select("id, company_id, name, description, created_at, updated_at")
    .single<ChecklistTemplateRow>();

  if (error) throw error;

  return mapChecklistTemplate(data);
}

export async function updateChecklistTemplate(
  payload: UpdateChecklistTemplatePayload
): Promise<ChecklistTemplate> {
  const { data, error } = await supabase
    .from("checklist_templates")
    .update({
      name: payload.name,
      description: payload.description,
    })
    .eq("id", payload.id)
    .select("id, company_id, name, description, created_at, updated_at")
    .single<ChecklistTemplateRow>();

  if (error) throw error;

  return mapChecklistTemplate(data);
}

export async function deleteChecklistTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from("checklist_templates")
    .delete()
    .eq("id", templateId);

  if (error) throw error;
}

export async function getChecklistItemsByTemplateIds(
  templateIds: string[]
): Promise<ChecklistItem[]> {
  if (!templateIds.length) return [];

  const { data, error } = await supabase
    .from("checklist_items")
    .select("id, template_id, text, item_order, created_at")
    .in("template_id", templateIds)
    .order("item_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<ChecklistItemRow[]>();

  if (error) throw error;

  return (data ?? []).map(mapChecklistItem);
}

export async function createChecklistItem(
  payload: CreateChecklistItemPayload
): Promise<ChecklistItem> {
  const { data, error } = await supabase
    .from("checklist_items")
    .insert({
      template_id: payload.templateId,
      text: payload.text,
      item_order: payload.itemOrder ?? 0,
    })
    .select("id, template_id, text, item_order, created_at")
    .single<ChecklistItemRow>();

  if (error) throw error;

  return mapChecklistItem(data);
}

export async function updateChecklistItem(
  payload: UpdateChecklistItemPayload
): Promise<ChecklistItem> {
  const { data, error } = await supabase
    .from("checklist_items")
    .update({
      text: payload.text,
      item_order: payload.itemOrder,
    })
    .eq("id", payload.id)
    .select("id, template_id, text, item_order, created_at")
    .single<ChecklistItemRow>();

  if (error) throw error;

  return mapChecklistItem(data);
}

export async function deleteChecklistItem(itemId: string): Promise<void> {
  const { error } = await supabase.from("checklist_items").delete().eq("id", itemId);
  if (error) throw error;
}
