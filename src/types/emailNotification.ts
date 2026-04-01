export type EmailNotificationType = "event" | "transaction" | "custom";

export interface EmailAttachmentInput {
  filename: string;
  contentBase64: string;
  contentType?: string;
}

export interface SendEmailNotificationInput {
  companyId?: string;
  to: string | string[];
  type?: EmailNotificationType;
  eventKey?: string;
  templateKey?: string;
  entityType?: string;
  entityId?: string;
  retryOf?: string;
  subject?: string;
  title?: string;
  message?: string;
  html?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  attachments?: EmailAttachmentInput[];
}

export interface SendEmailNotificationResult {
  success: boolean;
  messageId?: string;
  accepted?: unknown[];
  rejected?: unknown[];
}
