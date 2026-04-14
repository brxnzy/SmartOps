export function normalizeRoleName(value?: string | null): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

export function isCustomerRole(value?: string | null): boolean {
  return normalizeRoleName(value) === "customer";
}

export function isSuperAdminRole(value?: string | null): boolean {
  return normalizeRoleName(value) === "superadmin";
}
