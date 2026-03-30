import type { CompanyUserInput, UserFormValues } from "../types/userManagement.types";

function cleanInput(value: string): string {
  return value.trim();
}

export function toUserInput(values: UserFormValues): CompanyUserInput {
  const cleanName = cleanInput(values.name);
  const cleanIdCard = cleanInput(values.idCard);

  return {
    name: cleanName,
    idCard: cleanIdCard ? cleanIdCard : null,
    roleId: values.roleId,
  };
}

export function validateUserForm(values: UserFormValues, isEditMode: boolean) {
  const errors: Partial<Record<keyof UserFormValues, string>> = {};

  if (!isEditMode && !cleanInput(values.name)) {
    errors.name = "El nombre es obligatorio.";
  }

  if (!values.roleId) {
    errors.roleId = "Debes seleccionar un rol.";
  }

  return errors;
}

export function hasUserFormErrors(errors: Partial<Record<keyof UserFormValues, string>>) {
  return Object.values(errors).some(Boolean);
}
