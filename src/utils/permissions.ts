const ACTION_LABELS: Record<string, string> = {
  create: "Crear",
  read: "Ver",
  update: "Editar",
  delete: "Eliminar",
  disable: "Deshabilitar",
};

function toTitleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

export function formatPermissionCode(code: string): string {
  const [resourceRaw = "", actionRaw = ""] = code.split(".");

  if (!resourceRaw && !actionRaw) return code;

  const resourceLabel = toTitleCase(resourceRaw);

  if (!actionRaw) {
    return resourceLabel || code;
  }

  const actionLabel = ACTION_LABELS[actionRaw.toLowerCase()] ?? toTitleCase(actionRaw);

  return `${actionLabel} ${resourceLabel}`.trim();
}
