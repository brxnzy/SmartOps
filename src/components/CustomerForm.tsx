import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Building2, Contact2, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import Button from "./Button";
import Field from "./Field";
import Input from "./Input";
import {
  hasErrors,
  toCustomerInput,
  validateCustomerForm,
} from "../schemas/customer.validation";
import type {
  Customer,
  CustomerFormValues,
} from "../types/customer.types";
import { formatEmailsTextInput, formatPhonesTextInput } from "../utils/formatters";
import type { CustomerFormProps } from "../types/interfaces";


function getInitialValues(customer?: Customer | null): CustomerFormValues {
  if (!customer) {
    return {
      name: "",
      taxId: "",
      phones: "",
      emails: "",
      address: "",
      primaryContact: "",
      type: "hogar",
    };
  }

  return {
    name: customer.name,
    taxId: customer.taxId,
    phones: customer.phones.join(", "),
    emails: customer.emails.join(", "),
    address: customer.address,
    primaryContact: customer.primaryContact,
    type: customer.type,
  };
}

export default function CustomerForm({ initialData, submitting, onCancel, onSubmit }: CustomerFormProps) {
  const [values, setValues] = useState<CustomerFormValues>(() => getInitialValues(initialData));
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerFormValues, string>>>({});

  const formTitle = useMemo(
    () => (initialData ? "Editar cliente" : "Nuevo cliente"),
    [initialData]
  );

  const formSubtitle = initialData
    ? "Actualiza datos de contacto y clasificacion del cliente."
    : "Registra el cliente para comenzar a gestionar operaciones.";

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

    const payload = toCustomerInput(values);
    await onSubmit(payload);
  };

  return (
    <form className="space-y-6" onSubmit={submit}>
      <div className="rounded-2xl border border-blue-200 bg-linear-to-r from-blue-50 via-cyan-50 to-slate-50 p-5">
        <h3 className="text-xl font-semibold text-slate-900">{formTitle}</h3>
        <p className="mt-1 text-sm text-slate-600">{formSubtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nombre o razon social">
          <Input
            value={values.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Ej: Ferreteria Centro"
            icon={<Building2 size={16} />}
            disabled={submitting}
          />
          {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
        </Field>

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

        <Field label="Telefonos (separados por coma)">
          <Input
            value={values.phones}
            onChange={(event) => updateField("phones", formatPhonesTextInput(event.target.value))}
            placeholder="Ej: 8095550101, 8291234567"
            icon={<Phone size={16} />}
            inputMode="numeric"
            autoComplete="tel"
            disabled={submitting}
          />
          <p className="text-xs text-slate-500">Formato automatico RD: 809-555-0101</p>
          {errors.phones && <p className="text-xs text-red-600">{errors.phones}</p>}
        </Field>

        <Field label="Emails (separados por coma)">
          <Input
            value={values.emails}
            onChange={(event) => updateField("emails", formatEmailsTextInput(event.target.value))}
            placeholder="Ej: compras@empresa.com, admin@empresa.com"
            icon={<Mail size={16} />}
            autoComplete="email"
            disabled={submitting}
          />
          <p className="text-xs text-slate-500">Se normalizan en minusculas automaticamente.</p>
          {errors.emails && <p className="text-xs text-red-600">{errors.emails}</p>}
        </Field>

        <Field label="Contacto principal">
          <Input
            value={values.primaryContact}
            onChange={(event) => updateField("primaryContact", event.target.value)}
            placeholder="Ej: Juan Perez"
            icon={<Contact2 size={16} />}
            disabled={submitting}
          />
          {errors.primaryContact && <p className="text-xs text-red-600">{errors.primaryContact}</p>}
        </Field>

        <Field label="Tipo de cliente">
          <select
            value={values.type}
            onChange={(event) => updateField("type", event.target.value as CustomerFormValues["type"])}
            disabled={submitting}
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="hogar">Hogar</option>
            <option value="comercio">Comercio</option>
            <option value="empresa">Empresa</option>
          </select>
        </Field>
      </div>

      <Field label="Direccion">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-3 text-gray-400">
            <MapPin size={16} />
          </span>
          <textarea
            value={values.address}
            onChange={(event) => updateField("address", event.target.value)}
            disabled={submitting}
            placeholder="Direccion completa"
            rows={3}
            className="w-full rounded-xl border-2 border-slate-300 bg-white py-3 pr-3 pl-10 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
          />
        </div>
        {errors.address && <p className="text-xs text-red-600">{errors.address}</p>}
      </Field>

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
          {submitting ? "Guardando..." : initialData ? "Actualizar cliente" : "Crear cliente"}
        </Button>
      </div>
    </form>
  );
}
