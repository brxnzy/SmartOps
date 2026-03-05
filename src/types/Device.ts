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
