import Button from "../../components/Button";
import Field from "../../components/Field";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import { useModalCustomer } from "../../hooks/useModalCustomer";
import type { QuoteModalProps } from "../../types/interfaces";

export default function QuoteModal({ open, onClose, companyId, customerId, onSaved, profile }: QuoteModalProps) {
  const {
    title,
    currency,
    submitting,
    amount,
    setTitle,
    setAmount, 
    setCurrency,
    handleCreate
  } = useModalCustomer({ 
    open,
    onClose,
    companyId,
    customerId,
    onSaved,
    profile})

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
