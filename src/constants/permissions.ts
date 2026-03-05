export const PERMISSIONS = {
  dashboardRead: "dashboard.read",
  customersRead: "customers:read",
  devicesRead: "devices.read",
  rolesRead: "roles.read",
  rolesCreate: "roles.create",
  rolesUpdate: "roles.update",
  rolesDelete: "roles.delete",
  settingsProtocolsRead: "settings.protocols.read",
  settingsProtocolsCreate: "settings.protocols.create",
  settingsProtocolsUpdate: "settings.protocols.update",
  settingsProtocolsDelete: "settings.protocols.delete",
  settingsDeviceTypesRead: "settings.device-types.read",
  settingsDeviceTypesCreate: "settings.device-types.create",
  settingsDeviceTypesUpdate: "settings.device-types.update",
  settingsDeviceTypesDelete: "settings.device-types.delete",
} as const;

export type AppPermission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
    
