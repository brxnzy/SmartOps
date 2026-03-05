import type { CustomerFormValues, CustomerInput } from "../types/customer.types";
import { formatPhoneDigits } from "./formatters";

export type CustomerFormErrors = Partial<Record<keyof CustomerFormValues, string>>;

const RD_PHONE_REGEX = /^\d{3}-\d{3}-\d{4}$/;

export function validateCustomerForm(values: CustomerFormValues): CustomerFormErrors {
  const errors: CustomerFormErrors = {};

  if (!values.name.trim()) {
    errors.name = "El nombre es obligatorio.";
  }

  if (values.type === "hogar" && !values.idCard.trim()) {
    errors.idCard = "La cedula es obligatoria para clientes hogar.";
  }

  if (values.type !== "hogar" && !values.taxId.trim()) {
    errors.taxId = "El documento fiscal es obligatorio para comercio/empresa.";
  }

  const normalizedPhone = formatPhoneDigits(values.phone);
  if (values.phone.trim() && !RD_PHONE_REGEX.test(normalizedPhone)) {
    errors.phone = "El telefono debe tener 10 digitos (ej: 809-555-0101).";
  }

  return errors;
}

export function toCustomerInput(values: CustomerFormValues): CustomerInput {
  const normalizedPhone = formatPhoneDigits(values.phone);
  const taxId = values.type === "hogar" ? values.taxId.trim() || "NO_APLICA" : values.taxId.trim();

  return {
    name: values.name.trim(),
    idCard: values.idCard.trim() || null,
    phone: normalizedPhone || null,
    taxId,
    type: values.type,
  };
}

export function hasErrors(errors: CustomerFormErrors): boolean {
  return Object.values(errors).some(Boolean);
}

