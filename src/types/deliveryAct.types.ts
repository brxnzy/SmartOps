export type DeliveryActStatus = "pending" | "signed" | "accepted";

export type DeliveryActDevice = {
  deviceId: string | null;
  name: string;
  model: string | null;
  brand: string | null;
  zoneName: string | null;
  serial: string | null;
  mac: string | null;
  quantity: number;
};

export type DeliveryActCredential = {
  label: string;
  username: string | null;
  notes: string | null;
};

export type DeliveryAct = {
  id: string;
  companyId: string;
  projectId: string;
  status: DeliveryActStatus;
  pdfUrl: string | null;
  pdfPath: string | null;
  deliveredAt: string | null;
  signedAt: string | null;
  acceptedAt: string | null;
  warrantyTerms: string | null;
  devices: DeliveryActDevice[];
  credentials: DeliveryActCredential[];
  customerName: string | null;
  technicianName: string | null;
  siteName: string | null;
};

export type DeliveryActGenerateResult = {
  actId: string;
  pdfUrl: string | null;
  deliveredAt?: string | null;
};

export type DeliveryActSignResult = {
  actId: string;
  status: DeliveryActStatus;
  pdfUrl: string | null;
};
