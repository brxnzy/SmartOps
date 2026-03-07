export interface CompanyUser {
  id: string;
  userRoleId: string;
  companyId: string;
  name: string;
  idCard: string | null;
  roleId: string;
  roleName: string;
  createdAt: string;
}

export interface CompanyUserInput {
  name: string;
  idCard: string | null;
  roleId: string;
}

export interface CompanyUserQuery {
  page: number;
  pageSize: number;
  search?: string;
  roleId?: string;
}

export interface CompanyUsersResult {
  items: CompanyUser[];
  total: number;
}

export interface UserFormValues {
  name: string;
  idCard: string;
  roleId: string;
}
