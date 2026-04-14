export interface SuperadminUserSummary {
  id: string;
  name: string;
  email: string | null;
  photoUrl: string | null;
}

export interface SuperadminCompanySummary {
  id: string;
  name: string;
  logoUrl: string | null;
  createdAt: string | null;
  users: SuperadminUserSummary[];
  totalUsers: number;
}

export interface SuperadminOverview {
  companiesCount: number;
  totalUsers: number;
  companies: SuperadminCompanySummary[];
}
