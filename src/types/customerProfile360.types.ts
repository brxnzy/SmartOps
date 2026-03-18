export type Customer360TabKey =
  | "summary"
  | "sites"
  | "installations"
  | "devices"
  | "contracts"
  | "billing"
  | "tickets"
  | "quotes"
  | "visits";

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
  installations: number;
  devices: number;
  contracts: number;
  pendingInvoices: number;
  openTickets: number;
  pendingQuotes: number;
  technicalVisits: number;
}

export interface CustomerInstallation {
  id: string;
  siteId: string | null;
  name: string;
  siteName: string | null;
  workDescription: string | null;
  status: string;
  createdAt: string | null;
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

export interface CustomerInstalledDevice {
  id: string;
  name: string;
  serial: string | null;
  status: string;
  installationName: string | null;
  createdAt: string | null;
}

export interface CustomerContractPlan {
  id: string;
  planName: string;
  status: string;
  amount: number | null;
  currency: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface CustomerBillingRecord {
  id: string;
  reference: string;
  kind: "invoice" | "payment";
  status: string;
  amount: number | null;
  currency: string | null;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
}

export interface CustomerTicket {
  id: string;
  code: string;
  title: string;
  status: string;
  priority: string;
  openedAt: string | null;
  closedAt: string | null;
}

export interface CustomerQuote {
  id: string;
  code: string;
  title: string;
  status: string;
  amount: number | null;
  currency: string | null;
  createdAt: string | null;
}

export interface CustomerTechnicalVisit {
  id: string;
  title: string;
  status: string;
  technicianName: string | null;
  scheduledAt: string | null;
  finishedAt: string | null;
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
  installations: CustomerInstallation[];
  devices: CustomerInstalledDevice[];
  contracts: CustomerContractPlan[];
  billing: CustomerBillingRecord[];
  tickets: CustomerTicket[];
  quotes: CustomerQuote[];
  visits: CustomerTechnicalVisit[];
  timeline: CustomerTimelineEvent[];
}

export interface CreateCustomerTicketInput {
  title: string;
  priority: string;
}

export interface CreateCustomerQuoteInput {
  title: string;
  amount: number;
  currency: string;
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

export interface CreateCustomerInstallationInput {
  siteId?: string | null;
  name: string;
  workDescription?: string | null;
  status?: string;
}

export interface UpdateCustomerInstallationInput extends CreateCustomerInstallationInput {
  installationId: string;
}

export interface DevicesSectionProps {
  devices: CustomerInstalledDevice[];
}

export interface InstallationsSectionProps {
  installations: CustomerInstallation[];
}

export interface QuotesSectionProps {
  quotes: CustomerQuote[];
}

export interface SummarySectionProps {
  profile: Customer360BasicProfile;
  timeline: CustomerTimelineEvent[];
}

export interface TicketsSectionProps {
  tickets: CustomerTicket[];
}

export interface VisitsSectionProps {
  visits: CustomerTechnicalVisit[];
}

export interface SitesSectionProps {
  companyId: string | null;
  customerId: string | undefined;
  sites: CustomerSite[];
  installations: CustomerInstallation[];
  onRefresh: () => Promise<void>;
}

export interface SiteDetailModalProps {
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onOpenZones?: () => void;
  site: CustomerSite | null;
  installationsCount: number;
  attachments: CustomerSiteAttachmentAsset[];
  loading: boolean;
  error: string | null;
  activeIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
}


