export type InstalledDeviceStatus = "active" | "maintenance" | "retired";

export type InstalledDevice = {
  id: string;
  companyId: string;
  projectId: string;
  siteId: string;
  zoneId: string;
  catalogDeviceId: string;
  serial: string | null;
  mac: string | null;
  firmware: string | null;
  locationDetail: string | null;
  installedAt: string;
  installedBy: string | null;
  status: InstalledDeviceStatus;
  createdAt: string;
  updatedAt: string;
};

export type InstalledDeviceListItem = InstalledDevice & {
  deviceName: string;
  deviceModel: string | null;
  deviceBrand: string | null;
  zoneName: string | null;
  installedByName: string | null;
};

export type CreateInstalledDeviceInput = {
  companyId: string;
  projectId: string;
  siteId: string;
  zoneId: string;
  catalogDeviceId: string;
  serial: string | null;
  mac: string | null;
  firmware: string | null;
  locationDetail: string | null;
  installedAt: string | null;
  installedBy: string | null;
  status: InstalledDeviceStatus;
};

export type UpdateInstalledDeviceInput = {
  zoneId: string;
  catalogDeviceId: string;
  serial: string | null;
  mac: string | null;
  firmware: string | null;
  locationDetail: string | null;
  installedAt: string | null;
  installedBy: string | null;
  status: InstalledDeviceStatus;
};
