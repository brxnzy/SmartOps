import { X } from "lucide-react";
import CustomerForm from "./CustomerForm";
import type{ CustomerModalProps } from "../../types/interfaces";



export default function CustomerModal({
  open,
  customer,
  submitting,
  onClose,
  onSubmit,
}: CustomerModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 px-4 py-8 backdrop-blur-[2px]">
      <div className="relative max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full border border-slate-300 bg-white p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
        <CustomerForm
          initialData={customer}
          submitting={submitting}
          onCancel={onClose}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}
