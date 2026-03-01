import type { CustomerFormValues, CustomerInput } from "../types/customer.types";
import { formatPhoneDigits, splitByComma } from "../utils/formatters";

export type CustomerFormErrors = Partial<Record<keyof CustomerFormValues, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RD_PHONE_REGEX = /^\d{3}-\d{3}-\d{4}$/;

function normalizePhones(phones: string[]): string[] {
  return phones.map((phone) => formatPhoneDigits(phone)).filter(Boolean);
}

function normalizeEmails(emails: string[]): string[] {
  return emails.map((email) => email.trim().toLowerCase()).filter(Boolean);
}

export function validateCustomerForm(values: CustomerFormValues): CustomerFormErrors {
  const errors: CustomerFormErrors = {};

  if (!values.name.trim()) errors.name = "La razon social es obligatoria.";
  if (!values.taxId.trim()) errors.taxId = "El documento fiscal es obligatorio.";
  if (!values.address.trim()) errors.address = "La direccion es obligatoria.";
  if (!values.primaryContact.trim()) {
    errors.primaryContact = "El contacto principal es obligatorio.";
  }

  const phones = splitByComma(values.phones);
  if (phones.length === 0) {
    errors.phones = "Agrega al menos un telefono.";
  } else {
    const invalidPhone = phones.find((phone) => !RD_PHONE_REGEX.test(formatPhoneDigits(phone)));
    if (invalidPhone) {
      errors.phones = "Cada telefono debe tener 10 digitos (ej: 809-555-0101).";
    }
  }

  const emails = splitByComma(values.emails);
  if (emails.length === 0) {
    errors.emails = "Agrega al menos un email.";
  } else {
    const invalidEmail = emails.find((email) => !EMAIL_REGEX.test(email));
    if (invalidEmail) {
      errors.emails = `Email invalido: ${invalidEmail}`;
    }
  }

  return errors;
}

export function toCustomerInput(values: CustomerFormValues): CustomerInput {
  return {
    name: values.name.trim(),
    taxId: values.taxId.trim(),
    phones: normalizePhones(splitByComma(values.phones)),
    emails: normalizeEmails(splitByComma(values.emails)),
    address: values.address.trim(),
    primaryContact: values.primaryContact.trim(),
    type: values.type,
  };
}

export function hasErrors(errors: CustomerFormErrors): boolean {
  return Object.values(errors).some(Boolean);
}
