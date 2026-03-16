import Button from "../../components/Button";
import Field from "../../components/Field";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import { useModalCustomer } from "../../hooks/useModalCustomer";
import type { TicketModalProps } from "../../types/interfaces";


export default function TicketModal({ open, onClose, companyId, customerId, onSaved, profile }: TicketModalProps) {
  const {
    title,
    submitting,
    priority,
    setPriority, 
    setTitle,
    handleCreateTicket,
  } = useModalCustomer(
    {
    open,
    onClose,
    companyId,
    customerId,
    onSaved,
    profile
  })
  


  return (
    <Modal open={open} onClose={onClose} title="Nuevo ticket">
      <div className="space-y-3">
        <Field label="Titulo">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Describe la averia o incidencia"
            disabled={submitting}
          />
        </Field>
        <Field label="Prioridad">
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            disabled={submitting}
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </Field>
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
            onClick={() => void handleCreateTicket()}
            disabled={submitting}
            className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
          >
            Crear ticket
          </Button>
        </div>
      </div>
    </Modal>
  );
}
