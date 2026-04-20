export interface CompanyUser {
  id: string;
  userRoleId: string;
  companyId: string;
  name: string;
  idCard: string | null;
  photoUrl: string | null;
  roleId: string;
  roleName: string;
  createdAt: string;
  bannedUntil: string | null;
  isDisabled: boolean;
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
  companyTotals?: {
    technicians: number;
    clients: number;
    total: number;
  };
}

export interface UserFormValues {
  name: string;
  idCard: string;
  roleId: string;
}
