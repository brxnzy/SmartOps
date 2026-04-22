import { useCallback, useEffect, useState } from "react";
import Button from "../../components/Button";
import { PERMISSIONS } from "../../constants/permissions";
import { useAuth } from "../../hooks/useAuth";
import { notifications } from "../../services/notification.service";
import { listEmailDispatchHistory, retryEmailDispatch, type EmailDispatchHistoryEntry } from "../../services/emailDispatch.service";

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("es-DO");
}

function statusClass(status: EmailDispatchHistoryEntry["status"]): string {
  if (status === "sent") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "failed") return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function EmailHistory() {
  const { companyProfile, canAccess } = useAuth();
  const companyId = companyProfile?.id ?? null;
  const canRetry = canAccess(PERMISSIONS.emailHistoryRetry);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<EmailDispatchHistoryEntry[]>([]);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!companyId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await listEmailDispatchHistory(companyId);
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el historial.");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleRetry = async (entryId: string) => {
    if (!canRetry) {
      notifications.warning({
        title: "Sin permisos",
        description: "No tienes permisos para reintentar emails fallidos.",
      });
      return;
    }
    setRetryingId(entryId);
    try {
      await retryEmailDispatch(entryId);
      notifications.success({
        title: "Correo reenviado",
        description: "Se ejecuto el reintento de envio.",
      });
      await loadHistory();
    } catch (err) {
      notifications.error({
        title: "Error reintentando",
        description: err instanceof Error ? err.message : "No se pudo reintentar el correo.",
      });
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Historial de emails</h1>
            <p className="mt-2 text-sm text-slate-200">Revisa enviados/fallidos y ejecuta reintentos.</p>
          </div>
          <Button
            type="button"
            onClick={() => void loadHistory()}
            disabled={loading}
            className="border-white/20 bg-white text-slate-900 hover:bg-slate-100"
          >
            Recargar
          </Button>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {loading ? (
          <div className="text-sm text-slate-500">Cargando historial...</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : entries.length === 0 ? (
          <div className="text-sm text-slate-500">No hay correos registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Evento</th>
                  <th className="px-3 py-2">Destinatarios</th>
                  <th className="px-3 py-2">Asunto</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Intentos</th>
                  <th className="px-3 py-2">Error</th>
                  <th className="px-3 py-2">Accion</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-3 py-3 text-xs text-slate-500">{formatDateTime(entry.createdAt)}</td>
                    <td className="px-3 py-3 text-xs text-slate-700">{entry.eventKey ?? entry.templateKey ?? "-"}</td>
                    <td className="px-3 py-3 text-xs text-slate-700">{entry.toEmails.join(", ") || "-"}</td>
                    <td className="px-3 py-3 text-xs text-slate-700">{entry.subject}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(entry.status)}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-700">{entry.attemptCount}</td>
                    <td className="px-3 py-3 text-xs text-red-600">{entry.lastError ?? "-"}</td>
                    <td className="px-3 py-3">
                      {entry.status === "failed" ? (
                        <Button
                          type="button"
                          onClick={() => void handleRetry(entry.id)}
                          disabled={!canRetry || retryingId === entry.id}
                          className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        >
                          {retryingId === entry.id ? "Reintentando..." : "Reintentar"}
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
