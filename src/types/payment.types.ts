export type PaymentAccountStatus = "pending" | "partial" | "paid" | "cancelled";
export type PaymentTransactionStatus = "submitted" | "approved" | "rejected";
export type PaymentMethod = "cash" | "bank_transfer" | "card" | "other";

export interface PaymentAccountSummary {
  id: string;
  companyId: string;
  customerId: string;
  projectId: string;
  budgetId: string;
  status: PaymentAccountStatus;
  currency: string;
  amountTotal: number;
  amountPaid: number;
  amountPending: number;
  invoiceNumber: string;
  invoicePdfPath: string | null;
  invoiceIssuedAt: string | null;
  customerName: string | null;
  customerIdCard: string | null;
  siteName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTransaction {
  id: string;
  accountId: string;
  companyId: string;
  customerId: string;
  method: PaymentMethod;
  status: PaymentTransactionStatus;
  amount: number | null;
  reference: string | null;
  notes: string | null;
  proofFilePath: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  reviewNotes: string | null;
  receiptNumber: string | null;
  receiptPdfPath: string | null;
  customerName: string | null;
  invoiceNumber: string | null;
  accountPendingAmount: number;
  accountTotalAmount: number;
  accountStatus: PaymentAccountStatus;
  siteName: string | null;
}

export interface PaymentAccountDetail extends PaymentAccountSummary {
  transactions: PaymentTransaction[];
}
