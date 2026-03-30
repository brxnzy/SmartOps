import type { ErrorLike } from "../types/interfaces";
const CODE_MESSAGES: Record<string, string> = {
  invalid_credentials: "Credenciales invalidas.",
  user_banned: "El usuario esta desactivado. Contacte con el admin de su compania.",
  email_not_confirmed: "Debes confirmar tu correo antes de iniciar sesion.",
  email_address_invalid: "El correo electronico no es valido.",
  signup_disabled: "El registro de usuarios esta deshabilitado.",
  over_email_send_rate_limit:
    "Has intentado demasiadas veces. Intenta de nuevo mas tarde.",
};

const MESSAGE_PATTERNS: Array<{ pattern: RegExp; translated: string }> = [
  {
    pattern: /email not confirmed/i,
    translated: "Debes confirmar tu correo antes de iniciar sesion.",
  },
  {
    pattern: /invalid login credentials/i,
    translated: "Correo o contrasena incorrectos.",
  },
  {
    pattern: /user is banned|banned user|user banned/i,
    translated: "El usuario esta desactivado. Contacte con el admin de su compania.",
  },
  {
    pattern: /user already registered/i,
    translated: "Este correo ya esta registrado.",
  },
  {
    pattern: /password should be at least/i,
    translated: "La contrasena debe tener al menos 8 caracteres.",
  },
  {
    pattern: /unable to validate email address/i,
    translated: "El correo electronico no es valido.",
  },
  {
    pattern: /otp|token.*invalid|invalid token/i,
    translated: "El codigo de verificacion no es valido.",
  },
  {
    pattern: /expired|token.*expired/i,
    translated: "El codigo ha expirado. Solicita uno nuevo.",
  },
  {
    pattern: /too many requests|rate limit/i,
    translated: "Demasiados intentos. Espera un momento e intenta de nuevo.",
  },
];

function normalizeError(error: unknown): { code: string; message: string } {
  const err = (typeof error === "object" && error !== null
    ? (error as ErrorLike)
    : {}) as ErrorLike;

  const code = String(err.code ?? "").toLowerCase();
  const message =
    error instanceof Error
      ? error.message
      : typeof err.message === "string"
        ? err.message
        : "";

  return { code, message };
}

export function isEmailNotConfirmedError(error: unknown) {
  const { code, message } = normalizeError(error);
  return (
    code.includes("email_not_confirmed") || /email not confirmed/i.test(message)
  );
}

export function translateAuthError(
  error: unknown,
  fallback = "Ocurrio un error inesperado."
) {
  const { code, message } = normalizeError(error);

  if (code && CODE_MESSAGES[code]) {
    return CODE_MESSAGES[code];
  }

  const mappedPattern = MESSAGE_PATTERNS.find(({ pattern }) =>
    pattern.test(message)
  );
  if (mappedPattern) {
    return mappedPattern.translated;
  }

  if (message.trim()) {
    return message;
  }

  return fallback;
}
