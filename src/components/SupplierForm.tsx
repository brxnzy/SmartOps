import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Building2, Mail, MapPin, Phone } from "lucide-react";
import Button from "./Button";
import Field from "./Field";
import Input from "./Input";
import { hasErrors, toSupplierInput, validateSupplierForm } from "../utils/supplier";
import type { Supplier, SupplierFormValues } from "../types/supplier.types";
import { formatPhoneDigits } from "../utils/formatters";
import type { SupplierFormProps } from "../types/interfaces";

function getInitialValues(supplier?: Supplier | null): SupplierFormValues {
  if (!supplier) {
    return {
      name: "",
      email: "",
      phone: "",
      address: "",
    };
  }

  return {
    name: supplier.name,
    email: supplier.email ?? "",
    phone: supplier.phone ?? "",
    address: supplier.address ?? "",
  };
}

export default function SupplierForm({ initialData, submitting, onCancel, onSubmit }: SupplierFormProps) {
  const [values, setValues] = useState<SupplierFormValues>(() => getInitialValues(initialData));
  const [errors, setErrors] = useState<Partial<Record<keyof SupplierFormValues, string>>>({});

  const formTitle = useMemo(() => (initialData ? "Editar proveedor" : "Nuevo proveedor"), [initialData]);

  const formSubtitle = initialData
    ? "Actualiza la informacion del proveedor."
    : "Registra un nuevo proveedor para tu inventario.";

  const updateField = <K extends keyof SupplierFormValues>(field: K, value: SupplierFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validateSupplierForm(values);
    setErrors(validationErrors);

    if (hasErrors(validationErrors)) {
      return;
    }

    const payload = toSupplierInput(values);
    await onSubmit(payload);
  };

  return (
    <form className="space-y-6" onSubmit={submit}>
      <div className="rounded-2xl border border-amber-200 bg-linear-to-r from-amber-50 via-orange-50 to-slate-50 p-5">
        <h3 className="text-xl font-semibold text-slate-900">{formTitle}</h3>
        <p className="mt-1 text-sm text-slate-600">{formSubtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nombre">
          <Input
            value={values.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Ej: Proveedor Central"
            icon={<Building2 size={16} />}
            disabled={submitting}
          />
          {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
        </Field>

        <Field label="Email">
          <Input
            value={values.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="proveedor@correo.com"
            icon={<Mail size={16} />}
            autoComplete="email"
            disabled={submitting}
          />
          {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
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

        <Field label="Direccion">
          <Input
            value={values.address}
            onChange={(event) => updateField("address", event.target.value)}
            placeholder="Calle, ciudad, referencia"
            icon={<MapPin size={16} />}
            disabled={submitting}
          />
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
          icon={
            submitting ? (
              <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0A12 12 0 000 12h4z" />
              </svg>
            ) : undefined
          }
          className="border-amber-600 bg-amber-600 text-white hover:bg-amber-700"
        >
          {submitting ? "Guardando..." : initialData ? "Actualizar proveedor" : "Crear proveedor"}
        </Button>
      </div>
    </form>
  );
}
