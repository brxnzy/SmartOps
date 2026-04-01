import { useState } from "react";
import { useParams } from "react-router-dom";
import Button from "../../components/Button";
import { notifications } from "../../services/notification.service";
import { approveBudgetByToken } from "../../services/budget.service";

export default function BudgetApprovalPublic() {
  const { token } = useParams<{ token: string }>();
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleDecision = async (decision: "aprobar" | "rechazar") => {
    if (!token) return;
    setSubmitting(true);
    try {
      await approveBudgetByToken({ token, decision, notes: notes.trim() || null });
      setResult(decision === "aprobar" ? "Aprobada" : "Rechazada");
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo procesar la aprobacion.";
      notifications.error({
        title: "No se pudo procesar",
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
        Link de aprobacion invalido.
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-sm">
        <h1 className="text-2xl font-semibold">Aprobacion de cotizacion</h1>
        <p className="mt-2 text-sm text-slate-200">Confirma si deseas aprobar o rechazar la propuesta.</p>
      </header>

      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {result ? (
          <div className="text-center text-sm text-slate-700">
            Estado actualizado: <span className="font-semibold">{result}</span>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-600">
              Comentarios (opcional)
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-2 min-h-[120px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => handleDecision("aprobar")}
                disabled={submitting}
                className="border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Aprobar
              </Button>
              <Button
                type="button"
                onClick={() => handleDecision("rechazar")}
                disabled={submitting}
                className="border-red-600 bg-red-600 text-white hover:bg-red-700"
              >
                Rechazar
              </Button>
            </div>
          </div>
        )}
      </article>
    </section>
  );
}
