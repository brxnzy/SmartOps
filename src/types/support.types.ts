export type SupportRequestType = "bug" | "help" | "emergency";
export type SupportRequestPriority = "low" | "medium" | "high" | "critical";
export type SupportRequestStatus = "open" | "in_progress" | "closed";
export type SupportMessageAuthorKind = "admin" | "superadmin" | "system";

export type SupportRequest = {
  id: string;
  companyId: string;
  createdBy: string;
  type: SupportRequestType;
  priority: SupportRequestPriority;
  status: SupportRequestStatus;
  title: string;
  description: string;
  assignedSuperadmin: string | null;
  lastActivityAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupportMessage = {
  id: string;
  requestId: string;
  companyId: string;
  authorId: string;
  authorKind: SupportMessageAuthorKind;
  body: string;
  isInternal: boolean;
  createdAt: string;
  authorName?: string | null;
};

export type SuperadminSupportRequestRow = {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  type: SupportRequestType;
  priority: SupportRequestPriority;
  status: SupportRequestStatus;
  createdAt: string;
  lastActivityAt: string;
};

export type ActiveSupportImpersonation = {
  id: string;
  companyId: string;
  impersonatedUserId: string;
  expiresAt: string;
};

