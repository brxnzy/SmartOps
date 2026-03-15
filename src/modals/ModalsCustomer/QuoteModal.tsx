import { useEffect, useState } from "react";
import Button from "../../components/Button";
import Field from "../../components/Field";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import { createCustomerQuote } from "../../services/customerProfile360.service";
import { notifications } from "../../services/notification.service";
import { parseAmount } from "../../screens/admin/customerProfile360/utils";
import type { QuoteModalProps } from "../../types/interfaces";

export default function QuoteModal({ open, onClose, companyId, customerId, onSaved }: QuoteModalProps) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("DOP");
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <Modal open={open} onClose={onClose} title="Nueva cotizacion">
      <div className="space-y-3">
        <Field label="Titulo">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Nombre de la cotizacion"
            disabled={submitting}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Monto">
            <Input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="25000"
              disabled={submitting}
            />
          </Field>
          <Field label="Moneda">
            <Input
              value={currency}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              placeholder="DOP"
              disabled={submitting}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleCreate()}
            disabled={submitting}
            className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
          >
            Crear cotizacion
          </Button>
        </div>
      </div>
    </Modal>
  );
}
