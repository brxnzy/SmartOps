export const PERMISSIONS = {
  dashboardRead: "dashboard.read",
  customersRead: "customers:read",
  usersRead: "users.read",
  usersCreate: "users.create",
  usersUpdate: "users.update",
  usersDisable: "users.disable",
  devicesRead: "devices.read",
  devicesCreate: "devices.create",
  devicesUpdate: "devices.update",
  devicesDelete: "devices.delete",
  deviceInventoryRead: "device_inventory.read",
  deviceInventoryCreate: "device_inventory.create",
  deviceInventoryUpdate: "device_inventory.update",

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


  //Aqui iran los permisos para lo que tenga que ver con el customer
  settingsTicketCategoriesRead: "settings.ticket-categories.read",
  settingsTicketCategoriesCreate: "settings.ticket-categories.create",
  settingsTicketCategoriesUpdate: "settings.ticket-categories.update",
  settingsTicketCategoriesDelete: "settings.ticket-categories.delete",
  settingsBrandsRead: "settings.brands.read",
  settingsBrandsCreate: "settings.brands.create",
  settingsBrandsUpdate: "settings.brands.update",
  settingsBrandsDelete: "settings.brands.delete",
  accountUpdate: "account.update",
  settingsLogsRead: "settings.logs.read",
  ticketsRead: "tickets.read",
  ticketsUpdate: "tickets.update",
  ticketsAssign: "tickets.assign",
  ticketsComment: "tickets.comment",
} as const;

export type AppPermission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
    
