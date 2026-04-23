import useSignaturePad from "../hooks/useSignaturePad";
import Button from "./Button";

type SignaturePadProps = {
  disabled?: boolean;
  onConfirm: (dataUrl: string) => void;
};

export default function SignaturePad({ disabled = false, onConfirm }: SignaturePadProps) {
  const { canvasRef, isEmpty, startDrawing, draw, endDrawing, clear, getDataUrl } = useSignaturePad();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-800">Firma digital</p>
      <p className="mt-1 text-xs text-slate-500">Dibuja tu firma en el area y confirma.</p>
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <canvas
          ref={canvasRef}
          width={520}
          height={180}
          className="h-44 w-full touch-none"
          onPointerDown={disabled ? undefined : startDrawing}
          onPointerMove={disabled ? undefined : draw}
          onPointerUp={disabled ? undefined : endDrawing}
          onPointerLeave={disabled ? undefined : endDrawing}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => clear()}
          disabled={disabled || isEmpty}
          className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
        >
          Limpiar
        </Button>
        <Button
          type="button"
          onClick={() => onConfirm(getDataUrl())}
          disabled={disabled || isEmpty}
          className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
        >
          Confirmar firma
        </Button>
      </div>
    </div>
  );
}
