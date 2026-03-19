export interface InventoryLoadItem {
  id: string;
  inventoryLoadId: string;
  deviceId: string;
  deviceName: string;
  deviceModel: string;
  quantity: number;
}

export interface InventoryLoad {
  id: string;
  companyId: string;
  supplierId: string;
  supplierName: string;
  createdAt: string;
  items: InventoryLoadItem[];
}

export interface InventoryLoadItemInput {
  deviceId: string;
  quantity: number;
}

export interface InventoryLoadInput {
  supplierId: string;
  items: InventoryLoadItemInput[];
}
