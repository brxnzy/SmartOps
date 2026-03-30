import { AlertTriangle, X } from "lucide-react";
import Button from "../Button";
import type { CustomerDeleteModalProps } from "../../types/interfaces";

export default function CustomerDeleteModal({
  open,
  customer,
  submitting,
  onClose,
  onConfirm,
}: CustomerDeleteModalProps) {
  if (!open || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 px-4 py-8 backdrop-blur-[2px]">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="absolute top-4 right-4 rounded-full border border-slate-300 bg-white p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>

        <div className="mb-4 inline-flex rounded-full bg-red-100 p-2 text-red-700">
          <AlertTriangle size={18} />
        </div>

        <h3 className="text-lg font-semibold text-slate-900">Confirmar eliminacion</h3>
        <p className="mt-2 text-sm text-slate-600">
          Vas a eliminar el cliente <span className="font-semibold text-slate-900">{customer.name}</span>.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Esta accion oculta el cliente del listado actual y solo soporte podria revertirla.
        </p>

        <div className="mt-6 flex justify-end gap-3">
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
            className="border-red-600 bg-red-600 text-white hover:bg-red-700"
          >
            {submitting ? "Eliminando..." : "Eliminar cliente"}
          </Button>
        </div>
      </div>
    </div>
  );
}
