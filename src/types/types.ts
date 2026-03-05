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


export type UserRow = {
  id: string;
  name: string;
  id_card: string | null;
};
