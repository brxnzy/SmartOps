export const PERMISSIONS = {
  dashboardRead: "dashboard.read",
  customersRead: "customers.read",
  rolesRead: "roles.read",
  rolesCreate: "roles.create",
  rolesUpdate: "roles.update",
  rolesDelete: "roles.delete",
} as const;

export type AppPermission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
    
