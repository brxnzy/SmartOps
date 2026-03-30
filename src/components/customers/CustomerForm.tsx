import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Building2, IdCard, Mail, Phone, ShieldCheck } from "lucide-react";
import Button from "../Button";
import Field from "../Field";
import Input from "../Input";
import { hasErrors, toCustomerInput, validateCustomerForm } from "../../utils/customer";
import type { Customer, CustomerFormValues } from "../../types/customer.types";
import { formatIdCardDigits, formatPhoneDigits } from "../../utils/formatters";
import type { CustomerFormProps } from "../../types/interfaces";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getInitialValues(customer?: Customer | null): CustomerFormValues {
  if (!customer) {
    return {
      name: "",
      idCard: "",
      phone: "",
      taxId: "",
      type: "hogar",
    };
  }

  return {
    name: customer.name,
    idCard: customer.idCard ?? "",
    phone: customer.phone ?? "",
    taxId: customer.type === "hogar" ? "" : customer.taxId ?? "",
    type: customer.type,
  };
}

export default function CustomerForm({ initialData, submitting, onCancel, onSubmit }: CustomerFormProps) {
  const [values, setValues] = useState<CustomerFormValues>(() => getInitialValues(initialData));
  const [invitationEmail, setInvitationEmail] = useState("");
  const [invitationEmailError, setInvitationEmailError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerFormValues, string>>>({});

  const formTitle = useMemo(() => (initialData ? "Editar cliente" : "Nuevo cliente"), [initialData]);

  const formSubtitle = initialData
    ? "Actualiza los datos base del cliente."
    : "Registra un cliente y envia su invitacion de acceso.";

  const updateField = <K extends keyof CustomerFormValues>(field: K, value: CustomerFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validateCustomerForm(values);
    setErrors(validationErrors);

    if (hasErrors(validationErrors)) {
      return;
    }

    if (!initialData) {
      const email = invitationEmail.trim().toLowerCase();
      if (!email || !EMAIL_REGEX.test(email)) {
        setInvitationEmailError("Debes indicar un email valido para enviar invitacion.");
        return;
      }
      setInvitationEmailError(null);
    }

    const payload = toCustomerInput(values);
    await onSubmit(payload, {
      invitationEmail: !initialData ? invitationEmail.trim().toLowerCase() : undefined,
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
            icon={<Building2 size={16} />}
            disabled={submitting}
          />
          {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
        </Field>

        {!initialData ? (
          <Field label="Email de invitacion">
            <Input
              value={invitationEmail}
              onChange={(event) => {
                setInvitationEmail(event.target.value);
                setInvitationEmailError(null);
              }}
              placeholder="cliente@correo.com"
              icon={<Mail size={16} />}
              autoComplete="email"
              disabled={submitting}
            />
            {invitationEmailError && <p className="text-xs text-red-600">{invitationEmailError}</p>}
          </Field>
        ) : (
          <Field label="Tipo de cliente">
            <select
              value={values.type}
              onChange={(event) => {
                const nextType = event.target.value as CustomerFormValues["type"];
                updateField("type", nextType);
                if (nextType === "hogar") {
                  updateField("taxId", "");
                }
              }}
              disabled={submitting}
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="hogar">Hogar</option>
              <option value="comercio">Comercio</option>
              <option value="empresa">Empresa</option>
            </select>
          </Field>
        )}

        {!initialData && (
          <Field label="Tipo de cliente">
            <select
              value={values.type}
              onChange={(event) => {
                const nextType = event.target.value as CustomerFormValues["type"];
                updateField("type", nextType);
                if (nextType === "hogar") {
                  updateField("taxId", "");
                }
              }}
              disabled={submitting}
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="hogar">Hogar</option>
              <option value="comercio">Comercio</option>
              <option value="empresa">Empresa</option>
            </select>
          </Field>
        )}

        <Field label="Cedula">
          <Input
            value={values.idCard}
            onChange={(event) => updateField("idCard", formatIdCardDigits(event.target.value))}
            placeholder="Ej: 402-1234567-8"
            icon={<IdCard size={16} />}
            inputMode="numeric"
            disabled={submitting}
          />
          {errors.idCard && <p className="text-xs text-red-600">{errors.idCard}</p>}
        </Field>

        <Field label="Telefono">
          <Input
            value={values.phone}
            onChange={(event) => updateField("phone", formatPhoneDigits(event.target.value))}
            placeholder="Ej: 809-555-0101"
            icon={<Phone size={16} />}
            inputMode="numeric"
            autoComplete="tel"
            disabled={submitting}
          />
          {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
        </Field>

        {values.type !== "hogar" && (
          <Field label="Documento fiscal">
            <Input
              value={values.taxId}
              onChange={(event) => updateField("taxId", event.target.value.toUpperCase())}
              placeholder="Ej: 101-12345-6"
              icon={<ShieldCheck size={16} />}
              disabled={submitting}
            />
            {errors.taxId && <p className="text-xs text-red-600">{errors.taxId}</p>}
          </Field>
        )}
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
          icon={
            submitting ? (
              <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0A12 12 0 000 12h4z" />
              </svg>
            ) : undefined
          }
          className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
        >
          {submitting ? "Guardando..." : initialData ? "Actualizar cliente" : "Crear cliente"}
        </Button>
      </div>
    </form>
  );
}
