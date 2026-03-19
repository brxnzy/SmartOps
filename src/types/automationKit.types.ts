export interface AutomationKitItem {
  id: string | number;
  deviceId: string;
  deviceName: string;
  deviceModel: string;
  unitPrice: number;
  quantity: number;
}

export interface AutomationKit {
  id: string;
  name: string;
  description: string;
  price: number;
  createdAt: string;
  items: AutomationKitItem[];
}

export interface AutomationKitItemInput {
  deviceId: string;
  quantity: number;
}

export interface AutomationKitInput {
  name: string;
  description: string;
  price: number;
  items: AutomationKitItemInput[];
}
