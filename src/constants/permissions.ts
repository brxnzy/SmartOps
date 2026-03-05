export const PERMISSIONS = {
  dashboardRead: "dashboard.read",
  customersRead: "customers.read",
  rolesRead: "roles.read",
  rolesCreate: "roles.create",
  rolesUpdate: "roles.update",
  rolesDelete: "roles.delete",
  settingsProtocolsRead: "settings.protocols.read",
  settingsDeviceTypesRead: "settings.device-types.read",
} as const;

export type AppPermission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
    
