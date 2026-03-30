export interface ChecklistTemplate {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ChecklistItem {
  id: string;
  templateId: string;
  text: string;
  itemOrder: number;
  createdAt: string | null;
}

export interface CreateChecklistTemplatePayload {
  companyId: string;
  name: string;
  description: string | null;
}

export interface UpdateChecklistTemplatePayload {
  id: string;
  name: string;
  description: string | null;
}

export interface CreateChecklistItemPayload {
  templateId: string;
  text: string;
  itemOrder?: number | null;
}

export interface UpdateChecklistItemPayload {
  id: string;
  text: string;
  itemOrder: number | null;
}
