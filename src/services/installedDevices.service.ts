import { supabase } from "../libs/supabase";
import type {
  CreateInstalledDeviceInput,
  InstalledDeviceListItem,
  InstalledDeviceStatus,
  UpdateInstalledDeviceInput,
} from "../types/installedDevice.types";

type InstalledDeviceRow = {
  id: string;
  company_id: string;
  project_id: string;
  site_id: string;
  zone_id: string;
  catalog_device_id: string;
  source_layout_device_id?: string | null;
  serial: string | null;
  mac: string | null;
  firmware: string | null;
  location_detail: string | null;
  installed_at: string;
  installed_by: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  devices?: { name?: string | null; model?: string | null; brands?: { name?: string | null } | null } | null;
  customer_site_zones?: { name?: string | null } | null;
  users?: { name?: string | null } | null;
  deleted_at?: string | null;
};

function safeText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function safeNullableText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = safeText(value, "").trim();
  return text ? text : null;
}

function normalizeStatus(value: unknown): InstalledDeviceStatus {
  const raw = safeText(value, "active").toLowerCase();
  if (raw === "maintenance") return "maintenance";
  if (raw === "retired") return "retired";
  return "active";
}

function mapInstalledDevice(row: InstalledDeviceRow): InstalledDeviceListItem {
  return {
    id: row.id,
    companyId: safeText(row.company_id),
    projectId: safeText(row.project_id),
    siteId: safeText(row.site_id),
    zoneId: safeText(row.zone_id),
    catalogDeviceId: safeText(row.catalog_device_id),
    sourceLayoutDeviceId: safeNullableText(row.source_layout_device_id),
    serial: row.serial ?? null,
    mac: row.mac ?? null,
    firmware: row.firmware ?? null,
    locationDetail: row.location_detail ?? null,
    installedAt: safeText(row.installed_at),
    installedBy: row.installed_by ?? null,
    status: normalizeStatus(row.status),
    createdAt: safeText(row.created_at),
    updatedAt: safeText(row.updated_at),
    deviceName: safeText(row.devices?.name, "Dispositivo"),
    deviceModel: safeNullableText(row.devices?.model),
    deviceBrand: safeNullableText(row.devices?.brands?.name),
    zoneName: safeNullableText(row.customer_site_zones?.name),
    installedByName: safeNullableText(row.users?.name),
  };
}

export async function listInstalledDevicesByProject(params: {
  companyId: string;
  projectId: string;
}): Promise<InstalledDeviceListItem[]> {
  const { companyId, projectId } = params;

  const { data, error } = await supabase
    .from("installed_devices")
    .select(
      `
      id,
      company_id,
      project_id,
      site_id,
      zone_id,
      catalog_device_id,
      source_layout_device_id,
      serial,
      mac,
      firmware,
      location_detail,
      installed_at,
      installed_by,
      status,
      created_at,
      updated_at,
      deleted_at,
      users:installed_by ( name ),
      devices:catalog_device_id (
        name,
        model,
        brands:brand_id ( name )
      ),
      customer_site_zones:zone_id ( name )
      `
    )
    .eq("company_id", companyId)
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("installed_at", { ascending: false })
    .returns<InstalledDeviceRow[]>();

  if (error) {
    throw new Error(error.message || "No se pudieron cargar los dispositivos instalados.");
  }

  return (data ?? []).map(mapInstalledDevice);
}

export async function upsertInstalledDevicesFromLayout(params: {
  companyId: string;
  projectId: string;
  siteId: string;
  userId: string | null;
  rows: Array<{
    sourceLayoutDeviceId: string;
    zoneId: string;
    catalogDeviceId: string;
    locationDetail: string | null;
  }>;
}): Promise<{ insertedOrUpdated: number }> {
  const now = new Date().toISOString();
  const payload = params.rows
    .filter((row) => row.zoneId && row.catalogDeviceId && row.sourceLayoutDeviceId)
    .map((row) => ({
      company_id: params.companyId,
      project_id: params.projectId,
      site_id: params.siteId,
      zone_id: row.zoneId,
      catalog_device_id: row.catalogDeviceId,
      source_layout_device_id: row.sourceLayoutDeviceId,
      location_detail: row.locationDetail,
      installed_at: now,
      installed_by: params.userId,
      status: "active",
      updated_at: now,
      created_at: now,
      deleted_at: null,
      deleted_by: null,
    }));

  if (payload.length === 0) return { insertedOrUpdated: 0 };

  const { data, error } = await supabase
    .from("installed_devices")
    .upsert(payload, { onConflict: "company_id,project_id,source_layout_device_id" })
    .select("id")
    .returns<Array<{ id: string }>>();

  if (error) {
    throw new Error(error.message || "No se pudieron sincronizar los dispositivos instalados.");
  }

  return { insertedOrUpdated: (data ?? []).length };
}

export async function createInstalledDevice(input: CreateInstalledDeviceInput): Promise<string> {
  if (!input.companyId || !input.projectId || !input.siteId || !input.zoneId || !input.catalogDeviceId) {
    throw new Error("companyId, projectId, siteId, zoneId y catalogDeviceId son requeridos.");
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("installed_devices")
    .insert({
      company_id: input.companyId,
      project_id: input.projectId,
      site_id: input.siteId,
      zone_id: input.zoneId,
      catalog_device_id: input.catalogDeviceId,
      serial: input.serial?.trim() ? input.serial.trim() : null,
      mac: input.mac?.trim() ? input.mac.trim() : null,
      firmware: input.firmware?.trim() ? input.firmware.trim() : null,
      location_detail: input.locationDetail?.trim() ? input.locationDetail.trim() : null,
      installed_at: input.installedAt ?? undefined,
      installed_by: input.installedBy ?? null,
      status: input.status,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data?.id) {
    throw new Error(error?.message || "No se pudo registrar el dispositivo instalado.");
  }

  return data.id;
}

export async function updateInstalledDevice(params: {
  companyId: string;
  deviceId: string;
  patch: Partial<UpdateInstalledDeviceInput>;
}): Promise<void> {
  const { companyId, deviceId, patch } = params;
  const now = new Date().toISOString();

  const payload: Record<string, unknown> = {
    updated_at: now,
  };

  if (patch.zoneId) payload.zone_id = patch.zoneId;
  if (patch.catalogDeviceId) payload.catalog_device_id = patch.catalogDeviceId;
  if ("serial" in patch) payload.serial = patch.serial?.trim() ? patch.serial.trim() : null;
  if ("mac" in patch) payload.mac = patch.mac?.trim() ? patch.mac.trim() : null;
  if ("firmware" in patch) payload.firmware = patch.firmware?.trim() ? patch.firmware.trim() : null;
  if ("locationDetail" in patch) payload.location_detail = patch.locationDetail?.trim() ? patch.locationDetail.trim() : null;
  if ("installedAt" in patch) payload.installed_at = patch.installedAt ?? null;
  if ("installedBy" in patch) payload.installed_by = patch.installedBy ?? null;
  if ("status" in patch && patch.status) payload.status = patch.status;

  const { error } = await supabase
    .from("installed_devices")
    .update(payload)
    .eq("company_id", companyId)
    .eq("id", deviceId)
    .is("deleted_at", null);

  if (error) {
    throw new Error(error.message || "No se pudo actualizar el dispositivo instalado.");
  }
}

export async function updateInstalledDeviceStatus(params: {
  companyId: string;
  deviceId: string;
  status: InstalledDeviceStatus;
}): Promise<void> {
  return updateInstalledDevice({
    companyId: params.companyId,
    deviceId: params.deviceId,
    patch: { status: params.status },
  });
}

export async function softDeleteInstalledDevice(params: {
  companyId: string;
  deviceId: string;
  deletedBy: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("installed_devices")
    .update({
      deleted_at: now,
      deleted_by: params.deletedBy,
      updated_at: now,
    })
    .eq("company_id", params.companyId)
    .eq("id", params.deviceId)
    .is("deleted_at", null);

  if (error) {
    throw new Error(error.message || "No se pudo eliminar el dispositivo instalado.");
  }
}
