import type { ChangeEvent, RefObject } from "react";
import Button from "../../../../components/Button";
import Modal from "../../../../components/Modal";
import { Paperclip } from "lucide-react";
import type { SiteFormValues } from "./types";
import { MAX_SITE_ATTACHMENTS } from "./utils";

interface SiteAttachmentPreview {
  file: File;
  previewUrl: string | null;
  isImage: boolean;
}

interface SiteModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  submitting: boolean;
  values: SiteFormValues;
  onChange: (values: SiteFormValues) => void;
  isEdit: boolean;
  attachments: SiteAttachmentPreview[];
  onRemoveAttachment: (index: number) => void;
  onAttachmentsChange: (event: ChangeEvent<HTMLInputElement>) => void;
  attachmentInputRef: RefObject<HTMLInputElement>;
}

export default function SiteModal({
  open,
  onClose,
  onSave,
  submitting,
  values,
  onChange,
  isEdit,
  attachments,
  onRemoveAttachment,
  onAttachmentsChange,
  attachmentInputRef,
}: SiteModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar ubicacion" : "Nueva ubicacion"}
      subtitle="Registra los datos base del sitio y sus adjuntos."
      size="sm"
      overlayClassName="backdrop-blur-[6px]"
      backdropClassName="bg-slate-900/40"
      containerClassName="border border-slate-200 bg-white text-slate-900 shadow-[0_30px_80px_rgba(15,23,42,0.15)]"
      headerClassName="border-slate-100 px-7 py-5"
      titleClassName="text-lg font-semibold text-slate-900"
      subtitleClassName="text-xs text-slate-500"
      closeClassName="bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
      bodyClassName="px-7 py-5"
      footerClassName="border-slate-100 px-7 py-4"
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
            disabled={submitting}
            className="flex-[2] rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
          >
            {isEdit ? "Actualizar ubicacion" : "Guardar ubicacion"}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Nombre del sitio
            </label>
            <input
              value={values.name}
              onChange={(event) => onChange({ ...values, name: event.target.value })}
              placeholder="Ej. Sucursal Norte"
              disabled={submitting}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Direccion
            </label>
            <input
              value={values.address}
              onChange={(event) => onChange({ ...values, address: event.target.value })}
              placeholder="Ej. Av. Principal #123"
              disabled={submitting}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
            />
          </div>
        </div>

        {!isEdit ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
              <span>Adjuntos</span>
              <span className="normal-case font-medium tracking-normal text-[10px] text-slate-400">
                Maximo {MAX_SITE_ATTACHMENTS}
              </span>
            </div>

            {attachments.length > 0 ? (
              <div className="space-y-2">
                {attachments.map((attachment, index) => (
                  <div
                    key={`${attachment.file.name}-${index}`}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white">
                      {attachment.isImage && attachment.previewUrl ? (
                        <img
                          src={attachment.previewUrl}
                          alt={attachment.file.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Paperclip size={16} className="text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="truncate text-xs font-semibold text-slate-900">{attachment.file.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {attachment.file.type || "Archivo adjunto"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => onRemoveAttachment(index)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-500 shadow-none transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      Quitar
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No hay adjuntos seleccionados.</p>
            )}

            <Button
              type="button"
              onClick={() => attachmentInputRef.current?.click()}
              disabled={submitting || attachments.length >= MAX_SITE_ATTACHMENTS}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-none transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Agregar adjunto
            </Button>
            <input
              ref={attachmentInputRef}
              type="file"
              multiple
              onChange={onAttachmentsChange}
              className="hidden"
              disabled={submitting}
            />
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
