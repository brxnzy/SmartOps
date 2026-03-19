import { ChevronLeft, ChevronRight, FileText, MapPin, Paperclip } from "lucide-react";
import Button from "../../../../components/Button";
import Modal from "../../../../components/Modal";
import { formatDate } from "../../../../utils/utils";
import { isImageFileName } from "./utils";
import type { SiteDetailModalProps } from "../../../../types/customerProfile360.types";


export default function SiteDetailModal({
  open,
  onClose,
  onEdit,
  site,
  attachments,
  loading,
  error,
  activeIndex,
  onPrev,
  onNext,
  onSelect,
}: SiteDetailModalProps) {
  const activeAttachment = attachments[activeIndex] ?? null;
  const isActiveImage = activeAttachment ? isImageFileName(activeAttachment.fileName) : false;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalle del sitio"
      size="lg"
      hideHeader
      overlayClassName="backdrop-blur-[8px]"
      backdropClassName="bg-slate-900/40"
      containerClassName="max-h-[85vh] overflow-hidden border border-slate-200 bg-white text-slate-900 shadow-[0_30px_90px_rgba(15,23,42,0.18)]"
      bodyClassName="site-detail max-h-[85vh] overflow-y-auto bg-slate-50/60 p-0"
    >
      {site ? (
        <div className="site-detail">
          <div className="border-b border-slate-200 bg-linear-to-r from-slate-50 via-white to-slate-50 px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Detalle del sitio
                </p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">{site.name}</h3>
                <div className="mt-2 flex items-start gap-2 text-sm text-slate-600">
                  <MapPin size={14} className="mt-0.5 text-slate-400" />
                  <span>{site.address}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={onClose}
                  className="h-9 w-9 rounded-lg border border-blue-200 bg-blue-50 px-0 py-0 text-blue-700 shadow-none transition hover:bg-blue-100 hover:text-blue-800"
                  aria-label="Cerrar"
                >
                  X
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-6 px-6 pb-6 pt-5">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
              <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="relative aspect-4/3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {loading ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      Cargando adjuntos...
                    </div>
                  ) : attachments.length > 0 && activeAttachment ? (
                    isActiveImage ? (
                      <img
                        src={activeAttachment.url}
                        alt={activeAttachment.fileName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
                        <FileText size={32} />
                        <a
                          href={activeAttachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-semibold text-slate-700 hover:underline"
                        >
                          {activeAttachment.fileName}
                        </a>
                      </div>
                    )
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      Sin adjuntos registrados
                    </div>
                  )}

                  {attachments.length > 1 && !loading ? (
                    <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between px-4">
                      <Button
                        type="button"
                        onClick={onPrev}
                        className="h-9 w-9 rounded-full border border-blue-200 bg-blue-50/90 px-0 py-0 text-blue-700 shadow-none transition hover:bg-blue-100 hover:text-blue-800"
                      >
                        <ChevronLeft size={18} />
                      </Button>
                      <Button
                        type="button"
                        onClick={onNext}
                        className="h-9 w-9 rounded-full border border-blue-200 bg-blue-50/90 px-0 py-0 text-blue-700 shadow-none transition hover:bg-blue-100 hover:text-blue-800"
                      >
                        <ChevronRight size={18} />
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="truncate">
                    {attachments.length > 0 && activeAttachment ? activeAttachment.fileName : "Sin adjuntos"}
                  </span>
                  {attachments.length > 0 ? (
                    <span>
                      {activeIndex + 1} / {attachments.length}
                    </span>
                  ) : null}
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-slate-500">
                      Adjuntos
                    </div>
                    <span className="text-xs text-slate-400">{attachments.length} archivos</span>
                  </div>

                  {error ? (
                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  ) : attachments.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">No hay adjuntos registrados.</p>
                  ) : (
                    <div className="mt-3">
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {attachments.map((attachment, index) => {
                          const isActive = index === activeIndex;
                          const isImage = isImageFileName(attachment.fileName);
                          return (
                            <Button
                              key={attachment.id}
                              type="button"
                              onClick={() => onSelect(index)}
                              className={`flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border px-0 py-0 text-[10px] font-semibold shadow-none transition ${
                                isActive ? "border-slate-300 bg-slate-100" : "border-slate-200 bg-white"
                              }`}
                            >
                              {isImage ? (
                                <img
                                  src={attachment.url}
                                  alt={attachment.fileName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex flex-col items-center gap-1 px-2 text-slate-500">
                                  <Paperclip size={14} />
                                  <span className="truncate">{attachment.fileName}</span>
                                </div>
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <div className="space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-xs font-medium text-slate-500">
                        Fecha
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {formatDate(site.createdAt)}
                      </div>
                    </div>
                    
                  </div>
                </section>
                <Button
                  type="button"
                  onClick={onEdit}
                  className="h-10 w-full rounded-lg border border-blue-600 bg-blue-600 px-3 text-xs font-semibold text-white shadow-none transition hover:bg-blue-700"
                >
                  Editar sitio
                </Button>
              </div>
            </div>

          </div>
        </div>
      ) : (
        <p className="px-6 py-6 text-sm text-slate-500">No hay informacion disponible.</p>
      )}
    </Modal>
  );
}
