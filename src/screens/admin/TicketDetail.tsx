/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Paperclip, Send } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import Field from "../../components/Field";
import Modal from "../../components/Modal";
import { PERMISSIONS } from "../../constants/permissions";
import { useAuth } from "../../hooks/useAuth";
import { notifications } from "../../services/notification.service";
import {
  addTicketComment,
  createTicketTechnicalVisit,
  getTicketDetail,
  listTechnicians,
  updateTicketStatus,
} from "../../services/tickets.service";
import type { TicketComment, TicketListItem, TicketStatus } from "../../types/ticketing.types";

function statusLabel(status: TicketStatus): string {
  if (status === "abierto") return "Abierto";
  if (status === "en_proceso") return "En proceso";
  if (status === "esperando_cliente") return "Esperando cliente";
  if (status === "resuelto") return "Resuelto";
  if (status === "cerrado") return "Cerrado";
  return status;
}

function statusBadgeClass(status: TicketStatus): string {
  if (status === "abierto") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "en_proceso") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "esperando_cliente") return "bg-purple-50 text-purple-700 border-purple-200";
  if (status === "resuelto") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "cerrado") return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

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

export default function AdminTicketDetail() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { companyProfile, authUser, canAccess } = useAuth();
  const companyId = companyProfile?.id ?? null;
  const userId = authUser?.id ?? null;
  const canComment = canAccess(PERMISSIONS.ticketsComment);
  const canScheduleVisit = canAccess(PERMISSIONS.ticketsVisitSchedule);
  const canUpdateStatus = canAccess(PERMISSIONS.ticketsUpdate);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TicketListItem | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [attachments, setAttachments] = useState<Array<{ name: string; url?: string }>>([]);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [technicians, setTechnicians] = useState<Array<{ id: string; name: string }>>([]);
  const [visitStart, setVisitStart] = useState("");
  const [visitEnd, setVisitEnd] = useState("");
  const [visitTechnician, setVisitTechnician] = useState("");
  const [visitSubmitting, setVisitSubmitting] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentInternal, setCommentInternal] = useState(false);
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);

  const loadTicket = async () => {
    if (!companyId || !ticketId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getTicketDetail(companyId, ticketId);
      setTicket(data.ticket);
      setComments(data.comments);
      setAttachments(
        data.attachments
          .filter((attachment) => !attachment.commentId)
          .map((attachment) => ({ name: attachment.fileName, url: attachment.url }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el ticket.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTicket();
  }, [companyId, ticketId]);

  useEffect(() => {
    if (!companyId) {
      setTechnicians([]);
      return;
    }
    listTechnicians(companyId)
      .then(setTechnicians)
      .catch(() => setTechnicians([]));
  }, [companyId]);

  const completionRequirements = useMemo(() => {
    if (!ticket) return [];

    const isInProgress = ticket.status === "en_proceso";
    const hasSupportResponse = comments.some((comment) => comment.authorId && comment.authorId !== ticket.customerId);
    const hasResolutionNote = comments.some((comment) => comment.isInternal && comment.body.trim().length >= 10);

    return [
      {
        key: "in_progress",
        label: "Ticket en estado “En proceso”",
        ok: isInProgress,
        hint: "Usa “Iniciar atención” antes de completar.",
      },
      {
        key: "support_response",
        label: "Cliente fue informado (al menos un comentario del equipo)",
        ok: hasSupportResponse,
        hint: "Agrega un comentario para el cliente explicando la solución.",
      },
      {
        key: "resolution_note",
        label: "Nota interna de resolución (recomendado)",
        ok: hasResolutionNote,
        hint: "Agrega un comentario interno con el resumen técnico.",
        optional: true,
      },
    ] as const;
  }, [comments, ticket]);

  const canCompleteTicket = useMemo(() => {
    const required = completionRequirements.filter((item) => !("optional" in item && item.optional));
    return required.every((item) => item.ok);
  }, [completionRequirements]);

  const handleStatusChange = async (nextStatus: TicketStatus, opts?: { silent?: boolean }) => {
    if (!canUpdateStatus) {
      setError("No tienes permisos para actualizar el estado del ticket.");
      return;
    }
    if (!companyId || !ticketId) return;
    if (ticket?.status === nextStatus) return;

    setStatusUpdating(true);
    try {
      const updated = await updateTicketStatus(companyId, ticketId, nextStatus);
      setTicket(updated);
      if (!opts?.silent) {
        notifications.success({
          title: "Estado actualizado",
          description: `El ticket ahora está en estado “${statusLabel(nextStatus)}”.`,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo actualizar el estado del ticket.";
      setError(message);
      notifications.error({ title: "Error actualizando estado", description: message });
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleScheduleVisit = async () => {
    if (!canScheduleVisit) {
      setError("No tienes permisos para programar visitas tecnicas.");
      return;
    }
    if (!companyId || !ticketId || !visitStart) return;
    setVisitSubmitting(true);
    try {
      await createTicketTechnicalVisit(companyId, ticketId, {
        technicianId: visitTechnician || null,
        scheduledStart: new Date(visitStart).toISOString(),
        scheduledEnd: visitEnd ? new Date(visitEnd).toISOString() : null,
      });
      setVisitStart("");
      setVisitEnd("");
      setVisitTechnician("");
      setVisitModalOpen(false);

      notifications.success({
        title: "Visita programada",
        description: "La visita técnica fue registrada. Pendiente de confirmación del cliente.",
      });

      if (ticket?.status !== "cerrado" && ticket?.status !== "resuelto") {
        await handleStatusChange("esperando_cliente", { silent: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo programar la visita tecnica.";
      setError(message);
      notifications.error({ title: "Error programando visita", description: message });
    } finally {
      setVisitSubmitting(false);
    }
  };

  const handleConfirmComplete = async () => {
    if (!canCompleteTicket) {
      notifications.warning({
        title: "Faltan requisitos",
        description: "Completa los requisitos antes de marcar el ticket como completado.",
      });
      return;
    }

    setCompleteModalOpen(false);
    await handleStatusChange("resuelto");
  };

  const handleComment = async () => {
    if (!canComment) {
      setError("No tienes permisos para comentar tickets.");
      return;
    }
    if (!companyId || !ticketId || !userId || !commentText.trim()) return;
    setSubmitting(true);
    try {
      await addTicketComment(
        companyId,
        ticketId,
        userId,
        { body: commentText.trim(), isInternal: commentInternal },
        commentFiles
      );
      setCommentText("");
      setCommentFiles([]);
      await loadTicket();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el comentario.");
    } finally {
      setSubmitting(false);
    }
  };


  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Cargando ticket...
      </section>
    );
  }

  if (error || !ticket) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
        {error ?? "No se pudo cargar el ticket."}
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold text-slate-500">Ticket</p>
          <h1 className="text-2xl font-semibold text-slate-900">{ticket.code}</h1>
          <p className="mt-1 text-sm text-slate-500">{ticket.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => setVisitModalOpen(true)}
            disabled={!canScheduleVisit}
            className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
          >
            Programar visita tecnica
          </Button>
          <Button
            type="button"
            onClick={() => navigate("/admin/tickets")}
            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
          >
            Volver
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Estado</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
                ticket.status
              )}`}
            >
              {statusLabel(ticket.status)}
            </span>
          </div>

          {canUpdateStatus ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void handleStatusChange("en_proceso")}
                disabled={
                  statusUpdating ||
                  ticket.status === "en_proceso" ||
                  ticket.status === "resuelto" ||
                  ticket.status === "cerrado"
                }
                className="border-amber-600 bg-amber-600 text-white hover:bg-amber-700"
              >
                Iniciar atencion
              </Button>
              <Button
                type="button"
                onClick={() => setCompleteModalOpen(true)}
                disabled={statusUpdating || ticket.status === "resuelto" || ticket.status === "cerrado"}
                className="border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Marcar completado
              </Button>
              <Button
                type="button"
                onClick={() => void handleStatusChange("cerrado")}
                disabled={statusUpdating || ticket.status !== "resuelto"}
                className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              >
                Cerrar
              </Button>
            </div>
          ) : null}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Categoria</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {ticket.categoryName ?? ticket.categoryId.slice(0, 6)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">SLA</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{ticket.slaType}</p>
          <p className="text-xs text-slate-500">Vence: {formatDateTime(ticket.slaDueAt)}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Adjuntos</h2>
          <Button
            type="button"
            onClick={() => setAttachmentsOpen(true)}
            disabled={attachments.length === 0}
            className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
          >
            Ver adjuntos ({attachments.length})
          </Button>
        </div>
        {attachments.length === 0 ? <EmptyState text="No hay adjuntos." /> : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Comentarios</h2>
        {comments.length === 0 ? (
          <EmptyState text="Aun no hay comentarios." />
        ) : (
          <div className="mt-4 space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{comment.authorName ?? "Soporte"}</span>
                  <span>{formatDateTime(comment.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{comment.body}</p>
                {comment.isInternal ? (
                  <span className="mt-2 inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    Interno
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 space-y-2">
          <Field label="Nuevo comentario">
            <textarea
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              disabled={!canComment}
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
            />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={commentInternal}
                disabled={!canComment}
                onChange={(event) => setCommentInternal(event.target.checked)}
              />
              Comentario interno
            </label>
            <input
              type="file"
              multiple
              disabled={!canComment}
              onChange={(event) => setCommentFiles(Array.from(event.target.files ?? []))}
              className="text-xs text-slate-500"
            />
            <Button
              type="button"
              onClick={() => void handleComment()}
              disabled={!canComment || submitting}
              className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
              icon={<Send size={14} />}
            >
              Enviar
            </Button>
          </div>
        </div>
      </section>

      <Modal
        open={attachmentsOpen}
        onClose={() => setAttachmentsOpen(false)}
        title="Evidencias del ticket"
        subtitle="Archivos enviados por el cliente."
        size="xl"
        containerClassName="overflow-hidden border border-slate-200 bg-white"
        headerClassName="border-b border-slate-100 bg-white/80 px-6 py-5 backdrop-blur"
        bodyClassName="px-6 py-6"
      >
        {attachments.length === 0 ? (
          <EmptyState text="No hay adjuntos para mostrar." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {attachments.map((attachment) => (
              <div
                key={attachment.name}
                className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Paperclip size={14} className="text-slate-400" />
                  <span className="truncate">{attachment.name}</span>
                </div>
                {attachment.url ? (
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="h-40 w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500">
                    Archivo sin vista previa.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        open={visitModalOpen}
        onClose={() => setVisitModalOpen(false)}
        title="Programar visita tecnica"
        subtitle="Agenda fecha y tecnico para este ticket."
        size="lg"
        containerClassName="overflow-hidden border border-slate-100 bg-white"
        headerClassName="px-7 pt-7 pb-5"
        bodyClassName="px-7 py-0"
        footerClassName="px-7 py-4 bg-slate-50 border-t border-slate-100"
        footer={
          <>
            <Button
              type="button"
              onClick={() => setVisitModalOpen(false)}
              disabled={visitSubmitting}
              className="border-slate-200 bg-transparent text-slate-500 hover:bg-slate-100 font-medium text-sm"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleScheduleVisit()}
              disabled={!canScheduleVisit || visitSubmitting || !visitStart}
              className="border-0 bg-blue-600 text-white hover:bg-blue-800 font-medium text-sm"
            >
              Guardar visita
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5 py-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Inicio
              </label>
              <input
                type="datetime-local"
                value={visitStart}
                onChange={(event) => setVisitStart(event.target.value)}
                disabled={!canScheduleVisit}
                className="w-full h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Fin (opcional)
              </label>
              <input
                type="datetime-local"
                value={visitEnd}
                onChange={(event) => setVisitEnd(event.target.value)}
                disabled={!canScheduleVisit}
                className="w-full h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Tecnico
            </label>
            <select
              value={visitTechnician}
              onChange={(event) => setVisitTechnician(event.target.value)}
              disabled={!canScheduleVisit}
              className="w-full h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="">Sin asignar</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        open={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        title="Marcar ticket como completado"
        subtitle="Verifica los requisitos antes de finalizar la atención."
        size="lg"
        containerClassName="overflow-hidden border border-slate-200 bg-white"
        headerClassName="border-b border-slate-100 bg-white/80 px-6 py-5 backdrop-blur"
        bodyClassName="px-6 py-6"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Checklist de cierre</p>
            <p className="mt-1 text-xs text-slate-600">
              Evita cierres sin trazabilidad y deja evidencia para soporte/garantías.
            </p>
          </div>

          <div className="space-y-2">
            {completionRequirements.map((req) => (
              <div key={req.key} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <div className="mt-0.5">
                  {req.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-slate-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {req.label}{" "}
                    {"optional" in req && req.optional ? (
                      <span className="text-xs font-semibold text-slate-400">(opcional)</span>
                    ) : null}
                  </p>
                  {!req.ok ? <p className="mt-1 text-xs text-slate-600">{req.hint}</p> : null}
                </div>
              </div>
            ))}
          </div>

          {!canCompleteTicket ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Completa los requisitos obligatorios para habilitar “Marcar completado”.
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => setCompleteModalOpen(false)}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirmComplete()}
              disabled={statusUpdating || !canCompleteTicket}
              className="border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Marcar completado
            </Button>
          </div>
        </div>
      </Modal>

    </section>
  );
}
