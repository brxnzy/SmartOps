import { useEffect, useState } from "react";
import type { CustomerInput } from "../types/customer.types";
import type { EditCustomerModalProps } from "../types/interfaces";
import { notifications } from "../services/notification.service";
import { updateCustomer } from "../services/customers.service";
import { parseAmount } from "../utils/utils";
import { createCustomerQuote, createCustomerTicket } from "../services/customerProfile360.service";


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
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("DOP");
  const [priority, setPriority] = useState("media");

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


 

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setAmount("");
    setCurrency("DOP");
  }, [open]);

  const handleCreate = async () => {
    if (!companyId || !customerId) return;
    const parsedAmount = parseAmount(amount);
    if (!title.trim()) {
      notifications.warning({
        title: "Titulo requerido",
        description: "Debes escribir el titulo de la cotizacion.",
      });
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      notifications.warning({
        title: "Monto invalido",
        description: "Ingresa un monto mayor que 0.",
      });
      return;
    }

    setSubmitting(true);
    try {
      await createCustomerQuote(companyId, customerId, {
        title: title.trim(),
        amount: parsedAmount,
        currency: currency.trim().toUpperCase() || "DOP",
      });
      notifications.success({
        title: "Cotizacion creada",
        description: "La cotizacion se registro correctamente.",
      });
      onClose();
      await onSaved();
    } catch (err) {
      notifications.error({
        title: "No se pudo crear cotizacion",
        description: err instanceof Error ? err.message : "Error inesperado.",
      });
    } finally {
      setSubmitting(false);
    }
  };


  useEffect(() => {
    if (!open) return;
    setTitle("");
    setPriority("media");
  }, [open]);

  const handleCreateTicket = async () => {
    if (!companyId || !customerId) return;
    if (!title.trim()) {
      notifications.warning({
        title: "Titulo requerido",
        description: "Debes escribir el titulo del ticket.",
      });
      return;
    }

    setSubmitting(true);
    try {
      await createCustomerTicket(companyId, customerId, {
        title: title.trim(),
        priority,
      });
      notifications.success({
        title: "Ticket creado",
        description: "El ticket se registro correctamente.",
      });
      onClose();
      await onSaved();
    } catch (err) {
      notifications.error({
        title: "No se pudo crear ticket",
        description: err instanceof Error ? err.message : "Error inesperado.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return{
    values,
    submitting,
    title,
    currency,
    amount,
    priority,
    handleCreateTicket,
    setPriority,
    handleCreate,
    setCurrency,
    setAmount,
    setTitle,
    setValues,
    handleSave,
  }
}