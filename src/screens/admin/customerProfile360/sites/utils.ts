export const MAX_SITE_ATTACHMENTS = 3;
export const DEFAULT_SITE_STATUS = "active";

export function isImageFileName(value: string): boolean {
  const normalized = value.toLowerCase();
  return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg", ".avif"].some((ext) =>
    normalized.endsWith(ext)
  );
}
