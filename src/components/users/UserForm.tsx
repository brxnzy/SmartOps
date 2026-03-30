import { useMemo, useState, type FormEvent } from "react";
import { IdCard, Mail } from "lucide-react";
import Button from "../Button";
import Field from "../Field";
import Input from "../Input";
import type { Role } from "../../types/Role";
import type { CompanyUser, CompanyUserInput, UserFormValues } from "../../types/userManagement.types";
import { formatIdCardDigits } from "../../utils/formatters";
import { hasUserFormErrors, toUserInput, validateUserForm } from "../../utils/user";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface UserFormProps {
  initialData?: CompanyUser | null;
  roles: Role[];
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: CompanyUserInput, options: { invitationEmail?: string }) => Promise<void>;
}

function getInitialValues(user?: CompanyUser | null): UserFormValues {
  if (!user) {
    return {
      name: "",
      idCard: "",
      roleId: "",
    };
  }

  return {
    name: user.name,
    idCard: user.idCard ?? "",
    roleId: user.roleId,
  };
}

export default function UserForm({ initialData, roles, submitting, onCancel, onSubmit }: UserFormProps) {
  const [values, setValues] = useState<UserFormValues>(() => getInitialValues(initialData));
  const [invitationEmail, setInvitationEmail] = useState("");
  const [invitationEmailError, setInvitationEmailError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormValues, string>>>({});

  const isEditMode = Boolean(initialData);

  const formTitle = useMemo(() => (isEditMode ? "Editar usuario" : "Nuevo usuario"), [isEditMode]);
  const formSubtitle = isEditMode
    ? "Solo puedes cambiar el rol del usuario."
    : "Registra un usuario y envia su invitacion de acceso.";

  const updateField = <K extends keyof UserFormValues>(field: K, value: UserFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validateUserForm(values, isEditMode);
    setErrors(validationErrors);

    if (hasUserFormErrors(validationErrors)) {
      return;
    }

    if (!isEditMode) {
      const email = invitationEmail.trim().toLowerCase();
      if (!email || !EMAIL_REGEX.test(email)) {
        setInvitationEmailError("Debes indicar un email valido para enviar invitacion.");
        return;
      }
      setInvitationEmailError(null);
    }

    await onSubmit(toUserInput(values), {
      invitationEmail: !isEditMode ? invitationEmail.trim().toLowerCase() : undefined,
    });
  };

  return (
    <form className="space-y-6" onSubmit={submit}>
      <div className="rounded-2xl border border-blue-200 bg-linear-to-r from-blue-50 via-cyan-50 to-slate-50 p-5">
        <h3 className="text-xl font-semibold text-slate-900">{formTitle}</h3>
        <p className="mt-1 text-sm text-slate-600">{formSubtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nombre">
          <Input
            value={values.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Ej: Juan Perez"
            disabled={submitting || isEditMode}
          />
          {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
        </Field>

        {!isEditMode ? (
          <Field label="Email de invitacion">
            <Input
              value={invitationEmail}
              onChange={(event) => {
                setInvitationEmail(event.target.value);
                setInvitationEmailError(null);
              }}
              placeholder="usuario@correo.com"
              icon={<Mail size={16} />}
              autoComplete="email"
              disabled={submitting}
            />
            {invitationEmailError && <p className="text-xs text-red-600">{invitationEmailError}</p>}
          </Field>
        ) : (
          <Field label="Cedula">
            <Input
              value={values.idCard}
              disabled
              icon={<IdCard size={16} />}
            />
          </Field>
        )}

        {!isEditMode && (
          <Field label="Cedula">
            <Input
              value={values.idCard}
              onChange={(event) => updateField("idCard", formatIdCardDigits(event.target.value))}
              placeholder="Ej: 402-1234567-8"
              icon={<IdCard size={16} />}
              inputMode="numeric"
              disabled={submitting}
            />
          </Field>
        )}

        <Field label="Rol">
          <select
            value={values.roleId}
            onChange={(event) => updateField("roleId", event.target.value)}
            disabled={submitting}
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="">Selecciona un rol</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          {errors.roleId && <p className="text-xs text-red-600">{errors.roleId}</p>}
        </Field>
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
        <Button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
        >
          Cancelar
        </Button>

        <Button
          type="submit"
          disabled={submitting}
          className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
        >
          {submitting ? "Guardando..." : isEditMode ? "Actualizar rol" : "Crear usuario"}
        </Button>
      </div>
    </form>
  );
}
