import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../libs/supabase";
import type {
  AutomationKit,
  AutomationKitInput,
  AutomationKitItem,
  AutomationKitItemInput,
} from "../types/automationKit.types";

type AutomationKitItemRow = {
  id: string;
  kit_id: string;
  device_id: string;
  quantity: number;
  device: { id: string; name: string; model: string; price: number | string } | null;
};

type AutomationKitRow = {
  id: string;
  company_id: string;
  name: string;
  discount_percent: number;
  created_at: string | null;
  items: AutomationKitItemRow[] | null;
};

function buildErrorMessage(error: PostgrestError | null, fallback: string): string {
  if (!error) return fallback;
  return error.message || fallback;
}

function mapItem(row: AutomationKitItemRow): AutomationKitItem {
  const price = Number(row.device?.price ?? 0);
  return {
    id: row.id,
    deviceId: row.device_id,
    deviceName: row.device?.name ?? "Dispositivo",
    deviceModel: row.device?.model ?? "N/A",
    unitPrice: Number.isNaN(price) ? 0 : price,
    quantity: row.quantity,
  };
}

function mapKit(row: AutomationKitRow): AutomationKit {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    discountPercent: Number(row.discount_percent ?? 0),
    createdAt: row.created_at ?? new Date().toISOString(),
    items: (row.items ?? []).map(mapItem),
  };
}

function normalizeItems(items: AutomationKitItemInput[]): AutomationKitItemInput[] {
  const grouped = new Map<string, number>();
  for (const item of items) {
    if (!item.deviceId || item.quantity <= 0) continue;
    grouped.set(item.deviceId, (grouped.get(item.deviceId) ?? 0) + item.quantity);
  }
  return Array.from(grouped.entries()).map(([deviceId, quantity]) => ({ deviceId, quantity }));
}

export async function getAutomationKitsByCompany(companyId: string | null): Promise<AutomationKit[]> {
  if (!companyId) return [];

  const { data, error } = await supabase
    .from("automation_kits")
    .select(
      "id, company_id, name, discount_percent, created_at, items:automation_kit_items ( id, kit_id, device_id, quantity, device:devices ( id, name, model, price ) )"
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .returns<AutomationKitRow[]>();

  if (error) {
    throw new Error(buildErrorMessage(error, "No se pudo cargar el catalogo de kits."));
  }

  return (data ?? []).map(mapKit);
}

export async function createAutomationKit(
  companyId: string,
  input: AutomationKitInput
): Promise<AutomationKit> {
  const { data: kitRow, error: kitError } = await supabase
    .from("automation_kits")
    .insert({
      company_id: companyId,
      name: input.name,
      discount_percent: input.discountPercent,
    })
    .select("id, company_id, name, discount_percent, created_at")
    .single<Omit<AutomationKitRow, "items">>();

  if (kitError || !kitRow) {
    throw new Error(buildErrorMessage(kitError, "No se pudo crear el kit."));
  }

  const itemsPayload = normalizeItems(input.items);
  const { data: itemsData, error: itemsError } = await supabase
    .from("automation_kit_items")
    .insert(
      itemsPayload.map((item) => ({
        kit_id: kitRow.id,
        device_id: item.deviceId,
        quantity: item.quantity,
      }))
    )
    .select("id, kit_id, device_id, quantity, device:devices ( id, name, model, price )")
    .returns<AutomationKitItemRow[]>();

  if (itemsError) {
    throw new Error(buildErrorMessage(itemsError, "No se pudo guardar los productos del kit."));
  }

  return mapKit({
    ...kitRow,
    items: itemsData ?? [],
  });
}

export async function updateAutomationKit(
  kitId: string,
  input: AutomationKitInput
): Promise<AutomationKit> {
  const { data: kitRow, error: kitError } = await supabase
    .from("automation_kits")
    .update({
      name: input.name,
      discount_percent: input.discountPercent,
    })
    .eq("id", kitId)
    .select("id, company_id, name, discount_percent, created_at")
    .single<Omit<AutomationKitRow, "items">>();

  if (kitError || !kitRow) {
    throw new Error(buildErrorMessage(kitError, "No se pudo actualizar el kit."));
  }

  const { error: deleteError } = await supabase
    .from("automation_kit_items")
    .delete()
    .eq("kit_id", kitId);

  if (deleteError) {
    throw new Error(buildErrorMessage(deleteError, "No se pudo actualizar los productos del kit."));
  }

  const itemsPayload = normalizeItems(input.items);
  const { data: itemsData, error: itemsError } = await supabase
    .from("automation_kit_items")
    .insert(
      itemsPayload.map((item) => ({
        kit_id: kitId,
        device_id: item.deviceId,
        quantity: item.quantity,
      }))
    )
    .select("id, kit_id, device_id, quantity, device:devices ( id, name, model, price )")
    .returns<AutomationKitItemRow[]>();

  if (itemsError) {
    throw new Error(buildErrorMessage(itemsError, "No se pudo actualizar los productos del kit."));
  }

  return mapKit({
    ...kitRow,
    items: itemsData ?? [],
  });
}

export async function deleteAutomationKit(kitId: string): Promise<void> {
  const { error } = await supabase.from("automation_kits").delete().eq("id", kitId);
  if (error) {
    throw new Error(buildErrorMessage(error, "No se pudo eliminar el kit."));
  }
}
