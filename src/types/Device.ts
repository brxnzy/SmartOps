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
