export function formatPaymentAmount(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function sanitizeMoneyInput(value: string, max?: number): string {
  const normalized = value.replace(",", ".").replace(/[^0-9.]/g, "");
  const [integerPart = "", decimalPart = ""] = normalized.split(".");
  const compactInteger = integerPart.replace(/^0+(?=\d)/, "");
  let next = compactInteger || (normalized.startsWith(".") ? "0" : "");

  if (normalized.includes(".")) {
    next += `.${decimalPart.slice(0, 2)}`;
  }

  if (!next) return "";

  const numericValue = Number(next);
  if (typeof max === "number" && Number.isFinite(max) && Number.isFinite(numericValue) && numericValue > max) {
    return max.toFixed(2);
  }

  return next;
}
