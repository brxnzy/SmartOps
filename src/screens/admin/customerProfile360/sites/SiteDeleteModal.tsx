import Button from "../../../../components/Button";
import Modal from "../../../../components/Modal";
import type { SiteDeleteModalProps } from "../../../../types/interfaces";


export default function SiteDeleteModal({
  open,
  onClose,
  onConfirm,
  submitting,
  siteName,
}: SiteDeleteModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Eliminar sitio"
      size="sm"
      overlayClassName="backdrop-blur-[6px]"
      backdropClassName="bg-slate-900/40"
      containerClassName="overflow-hidden border border-slate-200 bg-white text-slate-900 shadow-[0_30px_80px_rgba(15,23,42,0.18)]"
      headerClassName="border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-5"
      bodyClassName="bg-white px-6 py-5"
      footerClassName="border-slate-200 bg-slate-50/70 px-6 py-4"
      titleClassName="text-lg font-semibold text-slate-900"
      closeClassName="bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
      footer={
        <>
          <Button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void onConfirm()}
            disabled={submitting}
            className="flex-1 border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
          >
            Eliminar
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-700">
          Vas a eliminar el sitio <span className="font-semibold">{siteName}</span>.
        </p>
        <p className="text-xs text-slate-500">
          Si existen instalaciones vinculadas, quedaran sin sitio asociado.
        </p>
      </div>
    </Modal>
  );
}
