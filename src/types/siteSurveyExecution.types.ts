export type SiteSurveyStatus = "pendiente" | "en_progreso" | "completado" | "cancelado";

export interface SurveyWall {
  id: string;
  points: [number, number, number, number];
}

export interface SurveyZoneLayout {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  colorIdx: number;
  sourceZoneId: string | null;
}

export interface SurveyDeviceLayout {
  id: string;
  deviceId: string;
  label: string;
  x: number;
  y: number;
  zoneId: string | null;
}

export interface SurveyLayout {
  walls: SurveyWall[];
  zones: SurveyZoneLayout[];
  devices: SurveyDeviceLayout[];
}

export interface SurveyCalendarEvent {
  visitId: string;
  surveyId: string;
  scheduledStart: string;
  scheduledEnd: string | null;
  technicianId: string | null;
  technicianName: string | null;
  status: string | null;
  ticketId: string | number | null;
  installationProjectId?: string | null;
  visitType?: "survey" | "ticket" | "installation";
  siteName: string | null;
  customerName: string | null;
  surveyStatus: string | null;
}

export interface SiteSurveyExecutionSummary {
  id: string;
  customerId: string | null;
  siteId: string | null;
  companyId: string | null;
  status: string | null;
  completedAt: string | null;
  requirements: string | null;
  observations: string | null;
  recomendations: string | null;
  risks: string | null;
  layout: SurveyLayout;
  siteName: string | null;
  customerName: string | null;
}

export interface TechnicalVisitExecutionSummary {
  id: string;
  siteSurveyId: string;
  scheduledStart: string;
  scheduledEnd: string | null;
  technicianId: string | null;
  status: string | null;
  ticketId: string | number | null;
}

export interface SurveyChecklistItem {
  id: string;
  siteSurveyId: string;
  text: string;
  checked: boolean;
  notes: string | null;
  sourceChecklistItemId: string | null;
  isCustom: boolean;
  itemOrder: number;
}

export interface SurveyZoneOption {
  id: string;
  customerSiteId: string;
  companyId: string;
  name: string;
}

export interface SurveyCatalogDevice {
  id: string;
  name: string;
  model: string;
  label: string;
  price?: number;
  installationPrice?: number | null;
}

export interface SurveyMediaItem {
  id: string;
  surveyId: string;
  filePath: string;
  fileType: string | null;
  category: string | null;
  description: string | null;
  zoneId: string | null;
  createdAt: string | null;
  signedUrl: string;
}

export interface SurveyExecutionData {
  survey: SiteSurveyExecutionSummary;
  visit: TechnicalVisitExecutionSummary | null;
  checklistItems: SurveyChecklistItem[];
  zones: SurveyZoneOption[];
  catalogDevices: SurveyCatalogDevice[];
  media: SurveyMediaItem[];
}

export interface ChecklistTemplateItemOption {
  id: string;
  text: string;
  itemOrder: number;
}

export interface ChecklistTemplateOption {
  id: string;
  name: string;
  description: string | null;
  source: "db" | "mock";
  items: ChecklistTemplateItemOption[];
}
