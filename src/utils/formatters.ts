const PHONE_DIGITS_REGEX = /\D/g;

export function splitByComma(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatPhoneDigits(rawValue: string): string {
  let digits = rawValue.replace(PHONE_DIGITS_REGEX, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }

  digits = digits.slice(0, 10);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;

  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function formatPhonesTextInput(value: string): string {
  const hasTrailingComma = /,\s*$/.test(value);

  const normalized = value
    .split(",")
    .map((part) => formatPhoneDigits(part))
    .filter(Boolean)
    .join(", ");

  if (!hasTrailingComma) return normalized;

  return normalized ? `${normalized}, ` : "";
}

export function formatEmailsTextInput(value: string): string {
  const hasTrailingComma = /,\s*$/.test(value);

  const normalized = value
    .split(",")
    .map((part) => part.trim().toLowerCase().replace(/\s+/g, ""))
    .filter(Boolean)
    .join(", ");

  if (!hasTrailingComma) return normalized;

  return normalized ? `${normalized}, ` : "";
}
