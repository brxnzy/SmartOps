import type { SupplierFormValues, SupplierInput } from "../types/supplier.types";
import { formatPhoneDigits } from "./formatters";

export type SupplierFormErrors = Partial<Record<keyof SupplierFormValues, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RD_PHONE_REGEX = /^\d{3}-\d{3}-\d{4}$/;

export function validateSupplierForm(values: SupplierFormValues): SupplierFormErrors {
  const errors: SupplierFormErrors = {};

  if (!values.name.trim()) {
    errors.name = "El nombre es obligatorio.";
  }

  if (values.email.trim() && !EMAIL_REGEX.test(values.email.trim().toLowerCase())) {
    errors.email = "El email debe ser valido.";
  }

  const normalizedPhone = formatPhoneDigits(values.phone);
  if (values.phone.trim() && !RD_PHONE_REGEX.test(normalizedPhone)) {
    errors.phone = "El telefono debe tener 10 digitos (ej: 809-555-0101).";
  }

  return errors;
}

export function toSupplierInput(values: SupplierFormValues): SupplierInput {
  const normalizedPhone = formatPhoneDigits(values.phone);

  return {
    name: values.name.trim(),
    email: values.email.trim() ? values.email.trim().toLowerCase() : null,
    phone: normalizedPhone || null,
    address: values.address.trim() || null,
  };
}

export function hasErrors(errors: SupplierFormErrors): boolean {
  return Object.values(errors).some(Boolean);
}
