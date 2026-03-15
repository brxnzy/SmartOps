import Button from "../../../../components/Button";
import Modal from "../../../../components/Modal";

interface SiteDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
  siteName: string;
}

export default function SiteDeleteModal({
  open,
  onClose,
  onConfirm,
  submitting,
  siteName,
}: SiteDeleteModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Eliminar sitio">
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Vas a eliminar el sitio <span className="font-semibold">{siteName}</span>.
        </p>
        <p className="text-xs text-slate-500">
          Si existen instalaciones vinculadas, quedaran sin sitio asociado.
        </p>
        <div className="flex justify-end gap-2">
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
            onClick={() => void onConfirm()}
            disabled={submitting}
            className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
          >
            Eliminar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
