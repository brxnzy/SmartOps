export interface SiteSurveySummary {
  id: string;
  createdAt: string;
  status: string | null;
  completedAt: string | null;
  companyId: string | null;
  customerId: string | null;
  customerName: string | null;
  siteId: string | null;
  siteName: string | null;
  requirements: string | null;
  observations: string | null;
  recomendations: string | null;
  risks: string | null;
  visitId: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  technicianId: string | null;
  technicianName: string | null;
  visitStatus: string | null;
}

export interface SiteSurveyChecklistItem {
  id: string;
  siteSurveyId: string;
  text: string;
  checked: boolean;
  notes: string | null;
  sourceChecklistItemId: string | null;
  isCustom: boolean;
  itemOrder: number;
  createdAt: string | null;
}

export interface SiteSurveyCreateInput {
  customerId: string;
  siteId: string;
  technicianId: string;
  scheduledStart: string;
  scheduledEnd?: string | null;
}

export interface SiteSurveyUpdateInput {
  requirements?: string | null;
  observations?: string | null;
  recomendations?: string | null;
  risks?: string | null;
  status?: string | null;
  completedAt?: string | null;
}

export interface SimpleOption {
  id: string;
  name: string;
}
