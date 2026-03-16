const DATE_FORMATTER = new Intl.DateTimeFormat("es-DO", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function formatDate(value: string | null): string {
  if (!value) return "Sin fecha";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "Sin fecha";
  return DATE_FORMATTER.format(new Date(timestamp));
}

export function formatMoney(value: number | null, currency: string | null): string {
  if (value === null) return "N/A";
  const code = currency || "DOP";

  try {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${code} ${value.toFixed(2)}`;
  }
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CL";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function parseAmount(value: string): number {
  const normalized = value.replace(",", ".").trim();
  return Number(normalized);
}
