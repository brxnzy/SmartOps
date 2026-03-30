export type TicketCategory = string;
export type TicketStatus =
  | "abierto"
  | "en_proceso"
  | "esperando_cliente"
  | "resuelto"
  | "cerrado";
export type TicketSla = "urgente" | "24h" | "48h";

export interface Ticket {
  id: string;
  code: string;
  companyId: string;
  customerId: string;
  siteId: string | null;
  zoneId: string | null;
  categoryId: string;
  status: TicketStatus;
  description: string;
  slaType: TicketSla;
  slaDueAt: string | null;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface TicketListItem extends Ticket {
  customerName?: string | null;
  technicianName?: string | null;
  siteName?: string | null;
  categoryName?: string | null;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string | null;
  body: string;
  isInternal: boolean;
  createdAt: string;
}

export interface TicketAttachment {
  id: string;
  ticketId: string;
  commentId: string | null;
  fileName: string;
  filePath: string;
  fileType: string | null;
  uploadedBy: string | null;
  createdAt: string;
  url?: string;
}

export interface CreateTicketInput {
  siteId: string | null;
  zoneId: string | null;
  categoryId: string;
  description: string;
  slaType: TicketSla;
}

export interface TicketCategoryItem {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  createdAt: string | null;
}

export interface CreateTicketCommentInput {
  body: string;
  isInternal: boolean;
}

export interface CreateTechnicalVisitInput {
  technicianId: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  status?: string | null;
}

export interface TechnicalVisitSummary {
  id: number;
  ticketId: string | null;
  ticketCode: string | null;
  siteName: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  technicianId: string | null;
  technicianName: string | null;
  status: string | null;
}
