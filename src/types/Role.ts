export interface RoleProfile {
  id: string;
  name: string;
}

export interface Permission {
  id: string;
  code: string;
}

export interface Role {
  id: string;
  name: string;
  companyId: string | null;
}


export interface CreateRolePayload {
  name: string;
  companyId: string;
}

export interface UpdateRolePayload {
  id: string;
  name: string;
} 