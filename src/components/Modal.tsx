import { useEffect } from "react";
import { X } from "lucide-react";
import type { ModalProps } from "../types/interfaces";

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  subtitle,
  overlayClassName = "",
  backdropClassName = "bg-slate-900/45",
  containerClassName = "",
  headerClassName = "",
  bodyClassName = "",
  footerClassName = "",
  titleClassName = "",
  subtitleClassName = "",
  closeClassName = "",
  showCloseButton = true,
  hideHeader = false,
  header,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-3xl",
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${overlayClassName} ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!open}
    >
      <button
        type="button"
        className={`absolute inset-0 ${backdropClassName}`}
        onClick={onClose}
        aria-label="Cerrar modal"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative w-full ${sizeClasses[size]} rounded-2xl bg-white shadow-2xl transition-all duration-200 ${containerClassName} ${
          open ? "translate-y-0 scale-100" : "translate-y-2 scale-95"
        }`}
      >
        {hideHeader ? (
          <h3 id="modal-title" className="sr-only">
            {title}
          </h3>
        ) : header ? (
          header
        ) : (
          <header className={`flex items-start justify-between border-b border-slate-200 px-5 py-4 ${headerClassName}`}>
            <div>
              <h3 id="modal-title" className={`text-lg font-semibold text-slate-900 ${titleClassName}`}>
                {title}
              </h3>
              {subtitle ? (
                <p className={`mt-1 text-xs text-slate-500 ${subtitleClassName}`}>{subtitle}</p>
              ) : null}
            </div>
            {showCloseButton ? (
              <button
                type="button"
                onClick={onClose}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 ${closeClassName}`}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            ) : null}
          </header>
        )}

        <div className={`px-5 py-4 ${bodyClassName}`}>{children}</div>

        {footer && (
          <footer className={`flex justify-end gap-2 border-t border-slate-200 px-5 py-4 ${footerClassName}`}>
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
