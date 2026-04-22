function normalizeToken(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  return normalized || null;
}

function humanizeStatus(value: string): string {
  const text = value.replace(/_/g, " ").trim();
  if (!text) return "Sin estado";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export type VisitStatusNormalized = "programada" | "en_progreso" | "completada" | "cancelada";
export type SiteSurveyStatusNormalized = "pendiente" | "en_progreso" | "completado" | "cancelado";

export function normalizeVisitStatus(value: string | null | undefined): VisitStatusNormalized | string | null {
  const normalized = normalizeToken(value);
  if (!normalized) return null;

  if (
    normalized === "programada" ||
    normalized === "pendiente" ||
    normalized === "scheduled" ||
    normalized === "agendada" ||
    normalized === "confirmada" ||
    normalized === "confirmado" ||
    normalized.includes("confirm")
  ) {
    return "programada";
  }

  if (
    normalized === "en_progreso" ||
    normalized === "in_progress" ||
    normalized.includes("progreso")
  ) {
    return "en_progreso";
  }

  if (
    normalized === "completada" ||
    normalized === "completado" ||
    normalized === "finalizada" ||
    normalized === "finalizado" ||
    normalized.includes("complet")
  ) {
    return "completada";
  }

  if (normalized === "cancelada" || normalized === "cancelado" || normalized.includes("cancel")) {
    return "cancelada";
  }

  return normalized;
}

export function normalizeSurveyStatus(value: string | null | undefined): SiteSurveyStatusNormalized | string | null {
  const normalized = normalizeToken(value);
  if (!normalized) return null;

  if (normalized === "pendiente" || normalized === "programada" || normalized === "borrador") {
    return "pendiente";
  }

  if (
    normalized === "en_progreso" ||
    normalized === "in_progress" ||
    normalized.includes("progreso")
  ) {
    return "en_progreso";
  }

  if (
    normalized === "completado" ||
    normalized === "completada" ||
    normalized === "finalizado" ||
    normalized === "finalizada" ||
    normalized.includes("complet")
  ) {
    return "completado";
  }

  if (normalized === "cancelado" || normalized === "cancelada" || normalized.includes("cancel")) {
    return "cancelado";
  }

  return normalized;
}

export function isSurveyCompletedStatus(value: string | null | undefined): boolean {
  return normalizeSurveyStatus(value) === "completado";
}

export function canStartVisitStatus(value: string | null | undefined): boolean {
  const normalized = normalizeVisitStatus(value);
  return normalized === null || normalized === "programada";
}

export function canCancelVisitStatus(value: string | null | undefined): boolean {
  const normalized = normalizeVisitStatus(value);
  return normalized === "programada" || normalized === "en_progreso";
}

export function canRescheduleVisitStatus(value: string | null | undefined): boolean {
  const normalized = normalizeVisitStatus(value);
  return normalized === "programada" || normalized === "cancelada";
}

export function canCancelSurveyStatus(value: string | null | undefined): boolean {
  const normalized = normalizeSurveyStatus(value);
  return normalized === "pendiente" || normalized === "en_progreso";
}

export function formatVisitStatusLabel(value: string | null | undefined): string {
  const normalized = normalizeVisitStatus(value);
  if (!normalized) return "Sin estado de visita";

  if (normalized === "programada") return "Programada";
  if (normalized === "en_progreso") return "En progreso";
  if (normalized === "completada") return "Completada";
  if (normalized === "cancelada") return "Cancelada";

  return humanizeStatus(normalized);
}

export function formatSurveyStatusLabel(value: string | null | undefined): string {
  const normalized = normalizeSurveyStatus(value);
  if (!normalized) return "Pendiente";

  if (normalized === "pendiente") return "Pendiente";
  if (normalized === "en_progreso") return "En progreso";
  if (normalized === "completado") return "Completado";
  if (normalized === "cancelado") return "Cancelado";

  return humanizeStatus(normalized);
}
