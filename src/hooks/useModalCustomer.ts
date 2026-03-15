import { useEffect, useState } from "react";
import type { CustomerInput } from "../types/customer.types";
import type { EditCustomerModalProps } from "../types/interfaces";
import { notifications } from "../services/notification.service";
import { updateCustomer } from "../services/customers.service";


const INITIAL_VALUES: CustomerInput = {
  name: "",
  idCard: null,
  phone: null,
  taxId: "",
  type: "hogar",
};

export const useModalCustomer = ({
  open,
  onClose,
  companyId,
  customerId,
  profile,
  onSaved,}: EditCustomerModalProps) => {
    const [values, setValues] = useState<CustomerInput>(INITIAL_VALUES);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues({
      name: profile.name,
      idCard: profile.idCard,
      phone: profile.phone,
      taxId: profile.taxId,
      type: profile.type,
    });
  }, [open, profile]);

  const handleSave = async () => {
    if (!companyId || !customerId) return;
    if (!values.name.trim()) {
      notifications.warning({
        title: "Nombre requerido",
        description: "Debes completar el nombre del cliente.",
      });
      return;
    }

    if (values.type !== "hogar" && !values.taxId.trim()) {
      notifications.warning({
        title: "Tax ID requerido",
        description: "Para comercio/empresa el documento fiscal es obligatorio.",
      });
      return;
    }

    setSubmitting(true);
    try {
      await updateCustomer(companyId, customerId, {
        name: values.name.trim(),
        idCard: values.idCard?.trim() || null,
        phone: values.phone?.trim() || null,
        taxId: values.type === "hogar" ? "NO_APLICA" : values.taxId.trim(),
        type: values.type,
      });
      notifications.success({
        title: "Cliente actualizado",
        description: "Se actualizaron los datos del cliente.",
      });
      onClose();
      await onSaved();
    } catch (err) {
      notifications.error({
        title: "No se pudo actualizar",
        description: err instanceof Error ? err.message : "Error inesperado.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return{
    values,
    submitting,
    setValues,
    handleSave,
  }
}