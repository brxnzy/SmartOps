export interface Protocol {
  id: number;
  name: string | null;
  companyId: string | null;
  createdAt: string | null;
}

export interface DeviceType {
  id: number;
  name: string;
  description: string | null;
  companyId: string | null;
  createdAt: string | null;
}

export interface CreateProtocolPayload {
  name: string | null;
  companyId: string;
}

export interface UpdateProtocolPayload {
  id: number;
  name: string | null;
}

export interface CreateDeviceTypePayload {
  name: string;
  description: string | null;
  companyId: string;
}

export interface UpdateDeviceTypePayload {
  id: number;
  name: string;
  description: string | null;
}

export interface Brand {
  id: string;
  name: string;
  companyId: string;
  createdAt: string | null;
}

export interface CreateBrandPayload {
  name: string;
  companyId: string;
}

export interface UpdateBrandPayload {
  id: string;
  name: string;
}

export interface Device {
  id: string;
  name: string;
  model: string;
  price: number;
  protocolId: string;
  deviceTypeId: number;
  companyId: string;
  createdAt: string | null;
  brandId: string;
}

export interface CreateDevicePayload {
  name: string;
  model: string;
  price: number;
  protocolId: string;
  deviceTypeId: number;
  companyId: string;
  brandId: string;
}

export interface UpdateDevicePayload {
  id: string;
  name: string;
  model: string;
  price: number;
  protocolId: string;
  deviceTypeId: number;
  brandId: string;
}

export interface DeviceInventory {
  id: string;
  deviceId: string;
  quantity: number;
  status: string | null;
  lastUpdated: string | null;
  device: {
    id: string;
    name: string;
    model: string;
    companyId: string | null;
  } | null;
}

export interface CreateDeviceInventoryPayload {
  deviceId: string;
  quantity: number;
  status: string | null;
}

export interface UpdateDeviceInventoryPayload {
  id: string;
  deviceId: string;
  quantity: number;
  status: string | null;
}
