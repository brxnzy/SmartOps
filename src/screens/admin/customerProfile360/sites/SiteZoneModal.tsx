import { useEffect, useRef } from "react";
import Button from "../../../../components/Button";
import Modal from "../../../../components/Modal";
import type { SiteZoneModalProps } from "../../../../types/interfaces";

export default function SiteZoneModal({
  open,
  onClose,
  onSave,
  submitting,
  value,
  onChange,
  siteName,
}: SiteZoneModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const input = inputRef.current;
    if (input) {
      input.focus();
      input.select();
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva zona"
      subtitle={siteName ? `Sitio: ${siteName}` : "Registra el espacio o area del sitio."}
      size="sm"
      overlayClassName="backdrop-blur-[6px]"
      backdropClassName="bg-slate-900/40"
      containerClassName="overflow-hidden border border-slate-200 bg-white text-slate-900 shadow-[0_30px_80px_rgba(15,23,42,0.18)]"
      headerClassName="border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-7 py-5"
      bodyClassName="bg-white px-7 py-5"
      footerClassName="border-slate-200 bg-slate-50/70 px-7 py-4"
      titleClassName="text-lg font-semibold text-slate-900"
      subtitleClassName="text-xs text-slate-500"
      closeClassName="bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
      footer={
        <>
          <Button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void onSave()}
            disabled={submitting || !value.trim()}
            className="flex-2 rounded-lg border border-slate-900 bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
          >
            Guardar zona
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="text-xs font-medium text-slate-500">
          Nombre de la zona
        </label>
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (!submitting && value.trim()) {
                onSave();
              }
            }
          }}
          placeholder="Ej. Sala, Cocina, Habitacion"
          disabled={submitting}
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
        />
        <p className="text-xs text-slate-500">
          Usa nombres cortos y claros para identificar facilmente las zonas del sitio.
        </p>
      </div>
    </Modal>
  );
}
