import { supabase } from "../libs/supabase";
import { logAuditEvent } from "./audit.service";
import type { TicketCategoryItem } from "../types/ticketing.types";

type TicketCategoryRow = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  created_at: string | null;
};

function mapCategory(row: TicketCategoryRow): TicketCategoryItem {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
  };
}

export async function listTicketCategories(companyId: string): Promise<TicketCategoryItem[]> {
  const { data, error } = await supabase
    .from("ticket_categories")
    .select("id, company_id, name, description, created_at")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message || "No se pudieron cargar las categorias.");
  }

  return (data ?? []).map((row) => mapCategory(row as TicketCategoryRow));
}

export async function createTicketCategory(payload: {
  companyId: string;
  name: string;
  description?: string | null;
}): Promise<TicketCategoryItem> {
  const { data, error } = await supabase
    .from("ticket_categories")
    .insert({
      company_id: payload.companyId,
      name: payload.name,
      description: payload.description ?? null,
    })
    .select("id, company_id, name, description, created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "No se pudo crear la categoria.");
  }

  const mapped = mapCategory(data as TicketCategoryRow);
  await logAuditEvent({
    action: "create",
    entity: "ticket_categories",
    entityId: mapped.id,
    companyId: payload.companyId,
    newValues: {
      name: mapped.name,
      description: mapped.description,
    },
  });

  return mapped;
}

export async function updateTicketCategory(payload: {
  id: string;
  name: string;
  description?: string | null;
}): Promise<TicketCategoryItem> {
  const { data, error } = await supabase
    .from("ticket_categories")
    .update({
      name: payload.name,
      description: payload.description ?? null,
    })
    .eq("id", payload.id)
    .select("id, company_id, name, description, created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "No se pudo actualizar la categoria.");
  }

  const mapped = mapCategory(data as TicketCategoryRow);
  await logAuditEvent({
    action: "update",
    entity: "ticket_categories",
    entityId: mapped.id,
    companyId: mapped.companyId,
    newValues: {
      name: mapped.name,
      description: mapped.description,
    },
  });

  return mapped;
}

export async function deleteTicketCategory(categoryId: string): Promise<void> {
  const { data, error } = await supabase
    .from("ticket_categories")
    .delete()
    .eq("id", categoryId)
    .select("id, company_id, name, description")
    .maybeSingle<TicketCategoryRow>();

  if (error) {
    throw new Error(error.message || "No se pudo eliminar la categoria.");
  }

  if (data) {
    await logAuditEvent({
      action: "delete",
      entity: "ticket_categories",
      entityId: data.id,
      companyId: data.company_id,
      oldValues: {
        name: data.name,
        description: data.description,
      },
    });
  }
}
