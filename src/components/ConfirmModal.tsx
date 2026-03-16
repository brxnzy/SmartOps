import { useEffect, useMemo, useState } from "react";
import Button from "./Button";
import Input from "./Input";
import Modal from "./Modal";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  confirmKeyword?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  loading = false,
  confirmKeyword = "eliminar",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [confirmationText, setConfirmationText] = useState("");

  useEffect(() => {
    if (!open) {
      setConfirmationText("");
    }
  }, [open]);

  const canConfirm = useMemo(
    () => confirmationText.trim().toLowerCase() === confirmKeyword.toLowerCase(),
    [confirmationText, confirmKeyword]
  );

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading || !canConfirm}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-600">{message}</p>
        <p className="text-sm text-slate-600">
          Escribe <span className="font-semibold">{confirmKeyword}</span> para confirmar.
        </p>
        <Input
          value={confirmationText}
          onChange={(event) => setConfirmationText(event.target.value)}
          placeholder={`Escribe ${confirmKeyword}`}
          maxLength={40}
        />
      </div>
    </Modal>
  );
}
