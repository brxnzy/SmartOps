export type Customer360TabKey =
  | "summary"
  | "sites"
  | "surveys"
  | "budgets"
  | "projects"
  | "devices";

export interface Customer360BasicProfile {
  id: string;
  companyId: string;
  name: string;
  idCard: string | null;
  phone: string | null;
  taxId: string;
  type: "hogar" | "comercio" | "empresa";
  createdAt: string;
  invitationEmail: string | null;
  invitationStatus: "accepted" | "pending" | "expired" | "none";
} 

export interface Customer360Kpis {
  sites: number;
  surveys: number;
  budgets: number;
  projects: number;
  devices: number;
}

export interface CustomerSite {
  id: string;
  name: string;
  address: string;
  city: string | null;
  status: string;
  createdAt: string | null;
}

export interface CustomerSiteZone {
  id: string;
  customerSiteId: string;
  companyId: string;
  name: string;
  createdAt: string | null;
}

export interface CustomerSiteAttachment {
  id: string;
  customerSiteId: string;
  companyId: string;
  fileName: string;
  filePath: string;
  createdAt: string | null;
}

export interface CustomerSiteAttachmentAsset extends CustomerSiteAttachment {
  url: string;
}

export interface CustomerTimelineEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  at: string;
}

export interface CustomerSurveySummary {
  id: string;
  status: string;
  visitStatus: string | null;
  siteName: string | null;
  technicianName: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  createdAt: string | null;
  completedAt: string | null;
}

export interface CustomerBudgetSummary {
  id: string;
  status: string;
  quoteStatus: string | null;
  siteName: string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  createdAt: string;
  sentAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  expiresAt: string | null;
}

export interface CustomerProjectSummary {
  id: string;
  budgetId: string;
  status: string;
  siteName: string | null;
  technicianName: string | null;
  visitStatus: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CustomerInstalledDeviceSummary {
  deviceId: string;
  deviceName: string | null;
  deviceModel: string | null;
  totalQuantity: number;
  lastInstalledAt: string | null;
}

export interface CustomerProfile360Data {
  profile: Customer360BasicProfile;
  kpis: Customer360Kpis;
  sites: CustomerSite[];
  surveys: CustomerSurveySummary[];
  budgets: CustomerBudgetSummary[];
  projects: CustomerProjectSummary[];
  devices: CustomerInstalledDeviceSummary[];
  timeline: CustomerTimelineEvent[];
}

export interface CreateCustomerSiteInput {
  name: string;
  address: string;
  city?: string | null;
  status?: string;
}

export interface UpdateCustomerSiteInput extends CreateCustomerSiteInput {
  siteId: string;
}

export interface SummarySectionProps {
  profile: Customer360BasicProfile;
  timeline: CustomerTimelineEvent[];
}

export interface SitesSectionProps {
  companyId: string | null;
  customerId: string | undefined;
  sites: CustomerSite[];
  onRefresh: () => Promise<void>;
}

export interface SiteDetailModalProps {
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onOpenZones?: () => void;
  site: CustomerSite | null;
  attachments: CustomerSiteAttachmentAsset[];
  loading: boolean;
  error: string | null;
  activeIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
}

