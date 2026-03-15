import { useEffect, useState } from "react";
import Button from "../../components/Button";
import Field from "../../components/Field";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import { createCustomerTicket } from "../../services/customerProfile360.service";
import { notifications } from "../../services/notification.service";

interface TicketModalProps {
  open: boolean;
  onClose: () => void;
  companyId: string | null;
  customerId: string | undefined;
  onSaved: () => Promise<void>;
}

export default function TicketModal({ open, onClose, companyId, customerId, onSaved }: TicketModalProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("media");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setPriority("media");
  }, [open]);

  const handleCreate = async () => {
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
            onClick={() => void handleCreate()}
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
