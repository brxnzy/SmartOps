import { supabase } from "../libs/supabase";
import type {
  Brand,
  Device,
  CreateDevicePayload,
  CreateDeviceTypePayload,
  CreateBrandPayload,
  CreateProtocolPayload,
  DeviceType,
  Protocol,
  UpdateDevicePayload,
  UpdateBrandPayload,
  UpdateDeviceTypePayload,
  UpdateProtocolPayload,
} from "../types/Device";
import type { BrandRow, DeviceRow, DeviceTypeRow, ProtocolRow } from "../types/types";

function mapProtocol(row: ProtocolRow): Protocol {
  return {
    id: row.id,
    name: row.name,
    companyId: row.company_id,
    createdAt: row.created_at,
  };
}

function mapDeviceType(row: DeviceTypeRow): DeviceType {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    companyId: row.company_id,
    createdAt: row.created_at,
  };
}

function mapBrand(row: BrandRow): Brand {
  return {
    id: row.id,
    name: row.name,
    companyId: row.company_id,
    createdAt: row.created_at,
  };
}

function mapDevice(row: DeviceRow): Device {
  return {
    id: row.id,
    name: row.name,
    model: row.model,
    price: Number(row.price),
    protocolId: row.protocol_id,
    deviceTypeId: row.device_type_id,
    companyId: row.company_id,
    createdAt: row.created_at,
    brandId: row.brand_id,
  };
}

export async function getProtocolsByCompany(companyId: string | null): Promise<Protocol[]> {
  const baseQuery = supabase
    .from("protocols")
    .select("id, name, company_id, created_at")
    .order("name", { ascending: true, nullsFirst: false });

  const query = companyId
    ? baseQuery.or(`company_id.eq.${companyId},company_id.is.null`)
    : baseQuery.is("company_id", null);

  const { data, error } = await query.returns<ProtocolRow[]>();

  if (error) throw error;

  return (data ?? []).map(mapProtocol);
}

export async function createProtocol(payload: CreateProtocolPayload): Promise<Protocol> {
  const { data, error } = await supabase
    .from("protocols")
    .insert({
      name: payload.name,
      company_id: payload.companyId,
    })
    .select("id, name, company_id, created_at")
    .single<ProtocolRow>();

  if (error) throw error;

  return mapProtocol(data);
}

export async function updateProtocol(payload: UpdateProtocolPayload): Promise<Protocol> {
  const { data, error } = await supabase
    .from("protocols")
    .update({ name: payload.name })
    .eq("id", payload.id)
    .select("id, name, company_id, created_at")
    .single<ProtocolRow>();

  if (error) throw error;

  return mapProtocol(data);
}

export async function deleteProtocol(protocolId: number): Promise<void> {
  const { error } = await supabase.from("protocols").delete().eq("id", protocolId);
  if (error) throw error;
}

export async function getDeviceTypesByCompany(companyId: string | null): Promise<DeviceType[]> {
  const baseQuery = supabase
    .from("device_types")
    .select("id, name, description, company_id, created_at")
    .order("name", { ascending: true });

  const query = companyId
    ? baseQuery.or(`company_id.eq.${companyId},company_id.is.null`)
    : baseQuery.is("company_id", null);

  const { data, error } = await query.returns<DeviceTypeRow[]>();

  if (error) throw error;

  return (data ?? []).map(mapDeviceType);
}

export async function createDeviceType(payload: CreateDeviceTypePayload): Promise<DeviceType> {
  const { data, error } = await supabase
    .from("device_types")
    .insert({
      name: payload.name,
      description: payload.description,
      company_id: payload.companyId,
    })
    .select("id, name, description, company_id, created_at")
    .single<DeviceTypeRow>();

  if (error) throw error;

  return mapDeviceType(data);
}

export async function updateDeviceType(payload: UpdateDeviceTypePayload): Promise<DeviceType> {
  const { data, error } = await supabase
    .from("device_types")
    .update({
      name: payload.name,
      description: payload.description,
    })
    .eq("id", payload.id)
    .select("id, name, description, company_id, created_at")
    .single<DeviceTypeRow>();

  if (error) throw error;

  return mapDeviceType(data);
}

export async function deleteDeviceType(deviceTypeId: number): Promise<void> {
  const { error } = await supabase.from("device_types").delete().eq("id", deviceTypeId);
  if (error) throw error;
}

export async function getBrandsByCompany(companyId: string | null): Promise<Brand[]> {
  if (!companyId) return [];

  const { data, error } = await supabase
    .from("brands")
    .select("id, name, company_id, created_at")
    .eq("company_id", companyId)
    .order("name", { ascending: true })
    .returns<BrandRow[]>();

  if (error) throw error;

  return (data ?? []).map(mapBrand);
}

export async function createBrand(payload: CreateBrandPayload): Promise<Brand> {
  const { data, error } = await supabase
    .from("brands")
    .insert({
      name: payload.name,
      company_id: payload.companyId,
    })
    .select("id, name, company_id, created_at")
    .single<BrandRow>();

  if (error) throw error;

  return mapBrand(data);
}

export async function updateBrand(payload: UpdateBrandPayload): Promise<Brand> {
  const { data, error } = await supabase
    .from("brands")
    .update({ name: payload.name })
    .eq("id", payload.id)
    .select("id, name, company_id, created_at")
    .single<BrandRow>();

  if (error) throw error;

  return mapBrand(data);
}

export async function deleteBrand(brandId: string): Promise<void> {
  const { error } = await supabase.from("brands").delete().eq("id", brandId);
  if (error) throw error;
}

export async function getDevicesByCompany(companyId: string | null): Promise<Device[]> {
  if (!companyId) return [];

  const { data, error } = await supabase
    .from("devices")
    .select("id, name, model, price, protocol_id, device_type_id, company_id, created_at, brand_id")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .returns<DeviceRow[]>();

  if (error) throw error;

  return (data ?? []).map(mapDevice);
}

export async function createDevice(payload: CreateDevicePayload): Promise<Device> {
  const { data, error } = await supabase
    .from("devices")
    .insert({
      name: payload.name,
      model: payload.model,
      price: payload.price,
      protocol_id: payload.protocolId,
      device_type_id: payload.deviceTypeId,
      company_id: payload.companyId,
      brand_id: payload.brandId,
    })
    .select("id, name, model, price, protocol_id, device_type_id, company_id, created_at, brand_id")
    .single<DeviceRow>();

  if (error) throw error;

  return mapDevice(data);
}

export async function updateDevice(payload: UpdateDevicePayload): Promise<Device> {
  const { data, error } = await supabase
    .from("devices")
    .update({
      name: payload.name,
      model: payload.model,
      price: payload.price,
      protocol_id: payload.protocolId,
      device_type_id: payload.deviceTypeId,
      brand_id: payload.brandId,
    })
    .eq("id", payload.id)
    .select("id, name, model, price, protocol_id, device_type_id, company_id, created_at, brand_id")
    .single<DeviceRow>();

  if (error) throw error;

  return mapDevice(data);
}

export async function deleteDevice(deviceId: string): Promise<void> {
  const { error } = await supabase.from("devices").delete().eq("id", deviceId);
  if (error) throw error;
}
