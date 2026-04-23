import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Send, ShieldAlert } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import Modal from "../../components/Modal";
import { useAuth } from "../../hooks/useAuth";
import useSupportImpersonation from "../../hooks/useSupportImpersonation";
import { notifications } from "../../services/notification.service";
import {
  addSupportMessage,
  listSupportMessages,
  superadminSetSupportStatus,
  startSupportImpersonation,
} from "../../services/support.service";
import { getSuperadminCompanyDetail } from "../../services/superadmin.service";
import type { SupportMessage, SupportRequestStatus, SuperadminSupportRequestRow } from "../../types/support.types";
import { supabase } from "../../libs/supabase";

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

function statusBadgeClass(status: SupportRequestStatus): string {
  if (status === "open") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "in_progress") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "closed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function statusLabel(status: SupportRequestStatus): string {
  if (status === "open") return "Open";
  if (status === "in_progress") return "In progress";
  if (status === "closed") return "Closed";
  return status;
}

export default function SuperAdminSupportRequestDetail() {
  const navigate = useNavigate();
  const { requestId } = useParams<{ requestId: string }>();
  const { authUser } = useAuth();
  const { refresh: refreshImpersonation } = useSupportImpersonation();
  const superadminId = authUser?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<SuperadminSupportRequestRow | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [impersonationOpen, setImpersonationOpen] = useState(false);
  const [closeRequestOpen, setCloseRequestOpen] = useState(false);
  const [impersonationUserId, setImpersonationUserId] = useState("");
  const [impersonationLoading, setImpersonationLoading] = useState(false);
  const [tenantAdmins, setTenantAdmins] = useState<Array<{ id: string; name: string }>>([]);

  const load = useCallback(async () => {
    if (!requestId) return;
    setLoading(true);
    setError(null);
    try {
      // We can derive request via superadmin inbox RPC by searching exact id using message table for company_id.
      // For now, fetch company_id from first message request, then use messages + RPC list for metadata.
      const { data: reqRow, error: reqError } = await supabase
        .from("support_requests")
        .select("id, company_id, title, type, priority, status, created_at, last_activity_at")
        .eq("id", requestId)
        .single<{
          id: string;
          company_id: string;
          title: string;
          type: SuperadminSupportRequestRow["type"];
          priority: SuperadminSupportRequestRow["priority"];
          status: SuperadminSupportRequestRow["status"];
          created_at: string;
          last_activity_at: string;
        }>();

      if (reqError || !reqRow) {
        throw new Error(reqError?.message || "No se pudo cargar la solicitud.");
      }

      const companyDetail = await getSuperadminCompanyDetail(reqRow.company_id);

      let effectiveStatus = reqRow.status;
      // Flujo natural: cuando el SuperAdmin abre una solicitud "open", pasa a "in_progress" automáticamente.
      if (effectiveStatus === "open") {
        try {
          await superadminSetSupportStatus(requestId, "in_progress");
          effectiveStatus = "in_progress";
        } catch {
          // best-effort; si falla por permisos/intermitencia no bloqueamos la vista
        }
      }

      setRequest({
        id: reqRow.id,
        companyId: reqRow.company_id,
        companyName: companyDetail.name || reqRow.company_id.slice(0, 8),
        title: reqRow.title,
        type: reqRow.type,
        priority: reqRow.priority,
        status: effectiveStatus,
        createdAt: reqRow.created_at,
        lastActivityAt: reqRow.last_activity_at,
      });

      setTenantAdmins(companyDetail.users.map((u) => ({ id: u.id, name: u.name })));
      const msgs = await listSupportMessages(reqRow.company_id, requestId);
      setMessages(msgs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la solicitud.");
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleMessages = useMemo(() => messages, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [visibleMessages.length]);

  const handleSend = async () => {
    if (!request?.companyId || !requestId || !superadminId) return;
    if (!messageText.trim()) return;
    setSending(true);
    try {
      await addSupportMessage({
        companyId: request.companyId,
        requestId,
        authorId: superadminId,
        authorKind: "superadmin",
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

  const handleCloseRequest = () => {
    if (!requestId) return;
    if (!request) return;
    if (request.status === "closed") return;
    setCloseRequestOpen(true);
  };

  const confirmCloseRequest = async () => {
    if (!requestId) return;
    if (!request) return;
    if (request.status === "closed") return;
    setClosing(true);
    try {
      await superadminSetSupportStatus(requestId, "closed");
      notifications.success({ title: "Solicitud cerrada", description: "La solicitud fue marcada como Closed." });
      await load();
      setCloseRequestOpen(false);
    } catch (err) {
      notifications.error({
        title: "No se pudo cerrar",
        description: err instanceof Error ? err.message : "No se pudo cerrar la solicitud.",
      });
    } finally {
      setClosing(false);
    }
  };

  const handleStartImpersonation = async () => {
    if (!request?.companyId || !impersonationUserId) return;
    setImpersonationLoading(true);
    try {
      await startSupportImpersonation({
        companyId: request.companyId,
        userId: impersonationUserId,
        ttlMinutes: 30,
      });
      await refreshImpersonation();
      notifications.success({
        title: "Modo soporte activado",
        description: "Sesión creada (30 min). Ya puedes navegar con el indicador activo.",
      });
      setImpersonationOpen(false);
      setImpersonationUserId("");
    } catch (err) {
      notifications.error({
        title: "No se pudo iniciar",
        description: err instanceof Error ? err.message : "No se pudo iniciar el modo soporte.",
      });
    } finally {
      setImpersonationLoading(false);
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
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          onClick={() => navigate("/superadmin/support")}
          className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
        >
          <ArrowLeft size={16} />
          Volver
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => void handleCloseRequest()}
            disabled={closing || request.status === "closed"}
            className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
          >
            {closing ? "Cerrando..." : "Cerrar solicitud"}
          </Button>
          <Button
            type="button"
            onClick={() => setImpersonationOpen(true)}
            disabled={request.status === "closed"}
            className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
            icon={<ShieldAlert size={16} />}
          >
            Modo soporte
          </Button>
        </div>
      </div>

      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">Tenant</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{request.companyName}</h1>
            <p className="mt-3 text-xs font-semibold text-slate-500">Solicitud</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{request.title}</h2>
            <p className="mt-2 text-xs text-slate-500">Creada: {formatDateTime(request.createdAt)}</p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-3">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
                request.status
              )}`}
            >
              {statusLabel(request.status)}
            </span>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {request.priority}
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {request.type}
              </span>
              <span className="text-xs text-slate-500">Actividad: {formatDateTime(request.lastActivityAt)}</span>
            </div>
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
              const isMine = msg.authorKind === "superadmin";
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
            placeholder={request.status === "closed" ? "Esta solicitud está cerrada." : "Escribe una respuesta para el admin..."}
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

      <Modal
        open={impersonationOpen}
        onClose={() => setImpersonationOpen(false)}
        title="Activar modo soporte"
        subtitle="Crea una sesión temporal para diagnosticar dentro del tenant. Se audita y expira automáticamente."
        size="lg"
        containerClassName="overflow-hidden border border-slate-200 bg-white"
        headerClassName="border-b border-slate-100 bg-white/80 px-6 py-5 backdrop-blur"
        bodyClassName="px-6 py-6"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500">Admin a impersonar</label>
            <select
              value={impersonationUserId}
              onChange={(event) => setImpersonationUserId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="">Selecciona un usuario</option>
              {tenantAdmins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              Duración: 30 minutos (configurable en el RPC).
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => setImpersonationOpen(false)}
              disabled={impersonationLoading}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleStartImpersonation()}
              disabled={impersonationLoading || !impersonationUserId}
              className="border-amber-600 bg-amber-600 text-white hover:bg-amber-700"
            >
              {impersonationLoading ? "Activando..." : "Activar"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={closeRequestOpen}
        onClose={() => setCloseRequestOpen(false)}
        title="Cerrar solicitud"
        subtitle="Esto marca la solicitud como cerrada. Quedará en historial y el chat se bloqueará para evitar nuevas respuestas."
        size="lg"
        containerClassName="overflow-hidden border border-slate-200 bg-white"
        headerClassName="border-b border-slate-100 bg-white/80 px-6 py-5 backdrop-blur"
        bodyClassName="px-6 py-6"
        footer={
          <>
            <Button
              type="button"
              onClick={() => setCloseRequestOpen(false)}
              disabled={closing}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void confirmCloseRequest()}
              disabled={closing}
              className="border-rose-600 bg-rose-600 text-white hover:bg-rose-700"
            >
              {closing ? "Cerrando..." : "Cerrar"}
            </Button>
          </>
        }
      >
        <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <p className="font-semibold text-rose-900">Antes de cerrar</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>La solicitud deja de aparecer como activa (Open/In progress).</li>
            <li>Se conserva todo el historial de mensajes.</li>
            <li>Si necesitan continuar, el admin debe crear una nueva solicitud.</li>
          </ul>
        </div>
      </Modal>
    </section>
  );
}
