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

export type ProtocolRow = {
  id: number;
  name: string | null;
  company_id: string | null;
  created_at: string | null;
};

export type DeviceTypeRow = {
  id: number;
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
