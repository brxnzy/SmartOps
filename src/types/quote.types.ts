export type QuoteStatus = "borrador" | "enviada";

export interface BudgetQuote {
  id: string;
  companyId: string;
  budgetId: string;
  status: QuoteStatus;
  quoteNumber: string;
  validUntil: string | null;
  terms: string | null;
  pdfPath: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}
