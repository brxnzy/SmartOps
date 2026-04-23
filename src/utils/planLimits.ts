import type { PostgrestError } from "@supabase/supabase-js";

type LimitExceededPayload = {
  error?: string;
  resource?: string;
  limit?: number;
  current?: number;
  planKey?: string;
};

function tryParseJsonMessage(message: string): LimitExceededPayload | null {
  const trimmed = message.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;
  try {
    return JSON.parse(trimmed) as LimitExceededPayload;
  } catch {
    return null;
  }
}

function formatLimitExceeded(resource: string): string {
  switch (resource) {
    case "clients":
      return "Has alcanzado el límite de clientes de tu plan. Debes hacer upgrade para agregar más.";
    case "sites":
      return "Has alcanzado el límite de sitios de tu plan. Debes hacer upgrade para agregar más.";
    case "devices":
      return "Has alcanzado el límite de dispositivos instalados de tu plan. Debes hacer upgrade para agregar más.";
    case "technicians":
      return "Has alcanzado el límite de usuarios/técnicos de tu plan. Debes hacer upgrade para agregar más.";
    case "tickets":
      return "Has alcanzado el límite mensual de tickets de tu plan. Debes hacer upgrade para crear más.";
    default:
      return "Has alcanzado un límite de tu plan. Debes hacer upgrade para continuar.";
  }
}

export function toPlanAwareErrorMessage(error: PostgrestError | null | undefined, fallback: string): string {
  if (!error) return fallback;

  if (error.code === "P0001") {
    const payload = tryParseJsonMessage(error.message || "");
    if (payload?.error === "limit_exceeded" && payload.resource) {
      return formatLimitExceeded(payload.resource);
    }
  }

  return error.message || fallback;
}

