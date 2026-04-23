import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import { useAuth } from "../../hooks/useAuth";
import { addSupportMessage, getSupportRequest, listSupportMessages } from "../../services/support.service";
import type { SupportMessage, SupportRequest } from "../../types/support.types";

function formatDateTime(value: string | null): string {
  if (!value) return "Sin fecha";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "Sin fecha";
  return new Intl.DateTimeFormat("es-DO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function statusBadgeClass(status: SupportRequest["status"]): string {
  if (status === "open") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "in_progress") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "closed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function statusLabel(status: SupportRequest["status"]): string {
  if (status === "open") return "Abierta";
  if (status === "in_progress") return "En progreso";
  if (status === "closed") return "Cerrada";
  return status;
}

export default function SupportRequestDetail() {
  const navigate = useNavigate();
  const { requestId } = useParams<{ requestId: string }>();
  const { companyProfile, authUser } = useAuth();
  const companyId = companyProfile?.id ?? null;
  const userId = authUser?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<SupportRequest | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    if (!companyId || !requestId) return;
    setLoading(true);
    setError(null);
    try {
      const [req, msgs] = await Promise.all([
        getSupportRequest(companyId, requestId),
        listSupportMessages(companyId, requestId),
      ]);
      setRequest(req);
      setMessages(msgs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la solicitud.");
    } finally {
      setLoading(false);
    }
  }, [companyId, requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleMessages = useMemo(() => messages.filter((msg) => !msg.isInternal), [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [visibleMessages.length]);

  const handleSend = async () => {
    if (!companyId || !requestId || !userId) return;
    if (!messageText.trim()) return;
    setSending(true);
    try {
      await addSupportMessage({
        companyId,
        requestId,
        authorId: userId,
        authorKind: "admin",
        body: messageText.trim(),
        isInternal: false,
      });
      setMessageText("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el mensaje.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Cargando solicitud...
      </section>
    );
  }

  if (error || !request) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
        {error ?? "No se pudo cargar la solicitud."}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center">
        <Button
          type="button"
          onClick={() => navigate("/admin/support")}
          className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
        >
          <ArrowLeft size={16} />
          Volver
        </Button>
      </div>

      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">Solicitud</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{request.title}</h1>
            <p className="mt-2 text-sm text-slate-600">{request.description}</p>
            <p className="mt-3 text-xs text-slate-500">Creada: {formatDateTime(request.createdAt)}</p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
                request.status
              )}`}
            >
              {statusLabel(request.status)}
            </span>
            <p className="text-xs text-slate-500">Actividad: {formatDateTime(request.lastActivityAt)}</p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Conversación</h2>
          <p className="text-xs text-slate-500">{visibleMessages.length} mensajes</p>
        </div>

        {visibleMessages.length === 0 ? (
          <div className="mt-4">
            <EmptyState text="Aún no hay mensajes." />
          </div>
        ) : (
          <div className="mt-4 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/40 p-4">
            {visibleMessages.map((msg) => {
              const isMine = msg.authorKind === "admin";
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl border px-4 py-3 shadow-xs ${
                      isMine ? "border-blue-200 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-800"
                    }`}
                  >
                    <div
                      className={`flex flex-wrap items-center justify-between gap-2 text-[11px] ${
                        isMine ? "text-blue-50/90" : "text-slate-500"
                      }`}
                    >
                      <span className={`font-semibold ${isMine ? "text-white" : "text-slate-700"}`}>
                        {msg.authorName ?? (msg.authorKind === "superadmin" ? "SuperAdmin" : "Admin")}
                      </span>
                      <span>{formatDateTime(msg.createdAt)}</span>
                    </div>
                    <p className={`mt-2 whitespace-pre-wrap text-sm ${isMine ? "text-white" : "text-slate-700"}`}>
                      {msg.body}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}

        <div className="mt-4 space-y-2">
          <textarea
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            rows={3}
            placeholder={request.status === "closed" ? "Esta solicitud está cerrada." : "Escribe un mensaje para soporte..."}
            disabled={request.status === "closed"}
            className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-300"
          />
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending || request.status === "closed" || !messageText.trim()}
              className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
              icon={<Send size={14} />}
            >
              Enviar
            </Button>
          </div>
        </div>
      </section>
    </section>
  );
}
