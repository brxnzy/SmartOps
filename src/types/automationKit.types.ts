export interface AutomationKitItem {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceModel: string;
  unitPrice: number;
  quantity: number;
}

export interface AutomationKit {
  id: string;
  companyId: string;
  name: string;
  discountPercent: number;
  createdAt: string;
  items: AutomationKitItem[];
}

export interface AutomationKitItemInput {
  deviceId: string;
  quantity: number;
}

export interface AutomationKitInput {
  name: string;
  discountPercent: number;
  items: AutomationKitItemInput[];
}
