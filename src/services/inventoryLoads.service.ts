import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../libs/supabase";
import type {
  InventoryLoad,
  InventoryLoadInput,
  InventoryLoadItem,
  InventoryLoadItemInput,
} from "../types/inventoryLoad.types";

type InventoryLoadItemRow = {
  id: string;
  inventory_load_id: string;
  device_id: string;
  quantity: number;
  device: { id: string; name: string; model: string } | null;
};

type InventoryLoadRow = {
  id: string;
  company_id: string;
  supplier_id: string;
  created_at: string | null;
  supplier: { id: string; name: string } | null;
  items: InventoryLoadItemRow[] | null;
};

type DeviceInventoryRow = {
  id: string;
  device_id: string;
  quantity: number;
  status: string | null;
  last_updated: string | null;
};

function buildErrorMessage(error: PostgrestError | null, fallback: string): string {
  if (!error) return fallback;
  return error.message || fallback;
}

function buildStatusFromQuantity(quantity: number): string {
  if (quantity <= 0) return "out_of_stock";
  if (quantity <= 5) return "low_stock";
  return "available";
}

function mapInventoryLoadItem(row: InventoryLoadItemRow): InventoryLoadItem {
  return {
    id: row.id,
    inventoryLoadId: row.inventory_load_id,
    deviceId: row.device_id,
    deviceName: row.device?.name ?? "Dispositivo",
    deviceModel: row.device?.model ?? "N/A",
    quantity: row.quantity,
  };
}

function mapInventoryLoad(row: InventoryLoadRow): InventoryLoad {
  return {
    id: row.id,
    companyId: row.company_id,
    supplierId: row.supplier_id,
    supplierName: row.supplier?.name ?? "Proveedor",
    createdAt: row.created_at ?? new Date().toISOString(),
    items: (row.items ?? []).map(mapInventoryLoadItem),
  };
}

export async function getInventoryLoadsByCompany(companyId: string | null): Promise<InventoryLoad[]> {
  if (!companyId) return [];

  const { data, error } = await supabase
    .from("inventory_loads")
    .select(
      "id, company_id, supplier_id, created_at, supplier:suppliers!inventory_loads_supplier_id_fkey ( id, name ), items:inventory_load_items ( id, inventory_load_id, device_id, quantity, device:devices ( id, name, model ) )"
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .returns<InventoryLoadRow[]>();

  if (error) {
    throw new Error(buildErrorMessage(error, "No se pudo cargar el historial de cargas."));
  }

  return (data ?? []).map(mapInventoryLoad);
}

export async function createInventoryLoad(
  companyId: string,
  input: InventoryLoadInput
): Promise<InventoryLoad> {
  const { data: loadRow, error: loadError } = await supabase
    .from("inventory_loads")
    .insert({
      company_id: companyId,
      supplier_id: input.supplierId,
    })
    .select(
      "id, company_id, supplier_id, created_at, supplier:suppliers!inventory_loads_supplier_id_fkey ( id, name )"
    )
    .single<Omit<InventoryLoadRow, "items">>();

  if (loadError || !loadRow) {
    throw new Error(buildErrorMessage(loadError, "No se pudo registrar la carga de inventario."));
  }

  const itemsPayload = normalizeItems(input.items);
  const { data: itemsData, error: itemsError } = await supabase
    .from("inventory_load_items")
    .insert(
      itemsPayload.map((item) => ({
        inventory_load_id: loadRow.id,
        device_id: item.deviceId,
        quantity: item.quantity,
      }))
    )
    .select("id, inventory_load_id, device_id, quantity, device:devices ( id, name, model )")
    .returns<InventoryLoadItemRow[]>();

  if (itemsError) {
    throw new Error(buildErrorMessage(itemsError, "No se pudo registrar los productos de la carga."));
  }

  for (const item of itemsPayload) {
    await applyInventoryQuantityChange(item.deviceId, item.quantity);
  }

  return mapInventoryLoad({
    ...loadRow,
    items: itemsData ?? [],
  });
}

function normalizeItems(items: InventoryLoadItemInput[]): InventoryLoadItemInput[] {
  const grouped = new Map<string, number>();

  for (const item of items) {
    if (!item.deviceId || item.quantity <= 0) continue;
    grouped.set(item.deviceId, (grouped.get(item.deviceId) ?? 0) + item.quantity);
  }

  return Array.from(grouped.entries()).map(([deviceId, quantity]) => ({
    deviceId,
    quantity,
  }));
}

async function applyInventoryQuantityChange(deviceId: string, delta: number): Promise<void> {
  const { data: current, error: currentError } = await supabase
    .from("device_inventory")
    .select("id, device_id, quantity, status, last_updated")
    .eq("device_id", deviceId)
    .maybeSingle<DeviceInventoryRow>();

  if (currentError) {
    throw new Error(buildErrorMessage(currentError, "No se pudo consultar el inventario del dispositivo."));
  }

  const nextQuantity = Math.max(0, (current?.quantity ?? 0) + delta);
  const nextStatus = buildStatusFromQuantity(nextQuantity);

  if (current?.id) {
    const { error: updateError } = await supabase
      .from("device_inventory")
      .update({
        quantity: nextQuantity,
        status: nextStatus,
        last_updated: new Date().toISOString(),
      })
      .eq("id", current.id);

    if (updateError) {
      throw new Error(buildErrorMessage(updateError, "No se pudo actualizar el inventario del dispositivo."));
    }
  } else {
    const { error: insertError } = await supabase.from("device_inventory").insert({
      device_id: deviceId,
      quantity: nextQuantity,
      status: nextStatus,
      last_updated: new Date().toISOString(),
    });

    if (insertError) {
      throw new Error(buildErrorMessage(insertError, "No se pudo crear el inventario del dispositivo."));
    }
  }
}
