import type { SurveyLayout } from "./siteSurveyExecution.types";

export type BudgetStatus = "borrador" | "enviada" | "aprobada" | "rechazada" | "expirada";
export type BudgetApprovalMethod = "link" | "internal" | "portal" | null;

export interface BudgetItem {
  id: string;
  budgetId: string;
  deviceId: string;
  zoneId: string | null;
  deviceName?: string | null;
  deviceModel?: string | null;
  zoneName?: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface BudgetSummary {
  id: string;
  companyId: string;
  surveyId: string;
  status: BudgetStatus;
  createdAt: string;
  updatedAt: string;
  customerName: string | null;
  siteName: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  sentAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  expiresAt: string | null;
  quoteStatus?: "borrador" | "enviada" | null;
}

export interface BudgetDetail extends BudgetSummary {
  layout: SurveyLayout;
  items: BudgetItem[];
  approvalMethod: BudgetApprovalMethod;
  approvalNotes: string | null;
  approvedByUserId: string | null;
  quoteStatus?: "borrador" | "enviada" | null;
  quoteNumber?: string | null;
  quoteSentAt?: string | null;
  quoteValidUntil?: string | null;
  quotePdfPath?: string | null;
}
