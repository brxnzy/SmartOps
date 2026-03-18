export type Customer360TabKey =
  | "summary"
  | "sites";

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

export interface CustomerProfile360Data {
  profile: Customer360BasicProfile;
  kpis: Customer360Kpis;
  sites: CustomerSite[];
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


