
export interface CompanyProfile {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  rnc: string | null;
  logoUrl: string | null;
}

export interface Company {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  rnc: string | null;
  logoUrl: string | null;
  createdAt: string;
}

export interface CompanyInput {
  name: string;
  address: string | null;
  phone: string | null;
  rnc: string | null;
  logoUrl?: string | null;
}
