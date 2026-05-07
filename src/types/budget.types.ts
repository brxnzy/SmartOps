import type { SurveyLayout } from "./siteSurveyExecution.types";

export type BudgetStatus = "borrador" | "enviada" | "aprobada" | "rechazada" | "expirada";
export type BudgetApprovalMethod = "link" | "internal" | "portal" | null;
export type BudgetExtraChargeType = "viaticos" | "transporte" | "extra";

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
  installationUnitPrice: number;
  installationSubtotal: number;
  totalSubtotal: number;
}

export interface BudgetExtraCharge {
  id: string;
  budgetId: string;
  companyId: string;
  label: string;
  chargeType: BudgetExtraChargeType;
  amount: number;
  itemOrder: number;
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
  devicesSubtotal: number;
  installationSubtotal: number;
  extraChargesSubtotal: number;
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
  extraCharges: BudgetExtraCharge[];
  approvalMethod: BudgetApprovalMethod;
  approvalNotes: string | null;
  approvedByUserId: string | null;
  quoteStatus?: "borrador" | "enviada" | null;
  quoteNumber?: string | null;
  quoteSentAt?: string | null;
  quoteValidUntil?: string | null;
  quotePdfPath?: string | null;
}
