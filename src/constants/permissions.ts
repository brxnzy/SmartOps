export const PERMISSIONS = {
  dashboardRead: "dashboard:read",
  customersRead: "customers:read",
} as const;

export type AppPermission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
