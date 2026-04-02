import type { Customer } from "./customer.types";


export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  idCard: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyRnc: string;
};


export type UserRow = {
  id: string;
  name: string;
  id_card: string | null;
  photo_url?: string | null;
};

export type RoleRow = {
  id: string;
  name: string;
  company_id: string | null;
};


export type RolePermissionByRoleRow = {
  role_id: string;
  permission: { code: string } | null; // era "permissions", ahora "permission"
};

export type RolePermissionByRoleId = Record<string, string[]>;

export type UserRoleRow = {
  company_id: string | null;
  companies: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    rnc: string | null;
    logo_url: string | null;
  } | null;
  roles: {
    id: string;
    name: string;
  } | null;
};


export type CustomerRow = {
  user_id: string;
  company_id: string;
  name: string;
  id_card: string | null;
  phone: string | null;
  tax_id: string;
  type: Customer["type"];
  created_at: string;
};


export type RolePermissionRow = {
  permissions: {
    code: string;
  } | null;
};

export type ProtocolRow = {
  id: string;
  name: string | null;
  company_id: string | null;
  created_at: string | null;
};

export type DeviceTypeRow = {
  id: string;
  name: string;
  description: string | null;
  company_id: string | null;
  created_at: string | null;
};

export type BrandRow = {
  id: string;
  name: string;
  company_id: string;
  created_at: string | null;
};

export type ChecklistTemplateRow = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ChecklistItemRow = {
  id: string;
  template_id: string;
  text: string;
  item_order: number | null;
  created_at: string | null;
};

export type DeviceRow = {
  id: string;
  name: string;
  model: string;
  price: number | string;
  installation_price: number | string | null;
  protocol_id: string;
  device_type_id: string;
  company_id: string;
  created_at: string | null;
  brand_id: string;
  compatibility: string | null;
};

export type DeviceInventoryDeviceJoinRow = {
  id: string;
  name: string;
  model: string;
  company_id: string | null;
};

export type DeviceInventoryRow = {
  id: string;
  device_id: string;
  quantity: number;
  status: string | null;
  last_updated: string | null;
  device: DeviceInventoryDeviceJoinRow | null;
};


