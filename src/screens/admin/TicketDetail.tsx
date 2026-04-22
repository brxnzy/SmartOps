/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import { Calendar, CheckCircle2, Circle, Clock, Paperclip, Send, User } from "lucide-react";
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
  const [technicalVisits, setTechnicalVisits] = useState<
    Array<{
      id: string;
      scheduledStart: string | null;
      scheduledEnd: string | null;
      technicianId: string | null;
      technicianName: string | null;
      status: string | null;
    }>
  >([]);

  const latestVisit = useMemo(() => technicalVisits[0] ?? null, [technicalVisits]);

  const loadTicket = async () => {
    if (!companyId || !ticketId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getTicketDetail(companyId, ticketId);
      setTicket(data.ticket);
      setComments(data.comments);
      setTechnicalVisits(
        (data.technicalVisits ?? []).map((visit) => ({
          id: visit.id,
          scheduledStart: visit.scheduledStart,
          scheduledEnd: visit.scheduledEnd,
          technicianId: visit.technicianId,
          technicianName: visit.technicianName,
          status: visit.status,
        }))
      );
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

  const assignedTechnicianId = useMemo(() => {
    if (!ticket) return null;
    return ticket.assignedTo ?? latestVisit?.technicianId ?? null;
  }, [latestVisit?.technicianId, ticket]);

  const assignedTechnicianName = useMemo(() => {
    const fromVisit = latestVisit?.technicianName ?? null;
    if (fromVisit) return fromVisit;
    if (!assignedTechnicianId) return null;
    return technicians.find((tech) => tech.id === assignedTechnicianId)?.name ?? null;
  }, [assignedTechnicianId, latestVisit?.technicianName, technicians]);

  const hasProgrammedTechnician = Boolean(assignedTechnicianId);
  const hasScheduledVisit = Boolean(latestVisit?.scheduledStart) && Boolean(latestVisit?.technicianId ?? assignedTechnicianId);
  const isAssignedToMe = Boolean(userId && assignedTechnicianId && userId === assignedTechnicianId);

  function toDateTimeLocalValue(value: string | null): string {
    if (!value) return "";
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) return "";
    const date = new Date(timestamp);
    const pad = (num: number) => String(num).padStart(2, "0");
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }

  const scheduleButtonLabel = hasProgrammedTechnician ? "Reprogramar visita técnica" : "Programar visita técnica";

  const openVisitModal = () => {
    const prefillTechnician = latestVisit?.technicianId ?? assignedTechnicianId ?? "";
    setVisitTechnician(prefillTechnician ?? "");
    setVisitStart(toDateTimeLocalValue(latestVisit?.scheduledStart ?? null));
    setVisitEnd(toDateTimeLocalValue(latestVisit?.scheduledEnd ?? null));
    setVisitModalOpen(true);
  };

  const completionRequirements = useMemo(() => {
    if (!ticket) return [];

    const isInProgress = ticket.status === "en_proceso";
    const hasSupportResponse = comments.some((comment) => comment.authorId && comment.authorId !== ticket.customerId);
    const hasResolutionNote = comments.some((comment) => comment.isInternal && comment.body.trim().length >= 10);

    return [
      {
        key: "technician_assigned",
        label: "Técnico programado/asignado",
        ok: hasProgrammedTechnician,
        hint: "Programa un técnico (visita técnica) antes de iniciar o completar.",
      },
      {
        key: "assigned_to_me",
        label: "Eres el técnico asignado",
        ok: isAssignedToMe,
        hint: "Solo el técnico asignado puede iniciar y completar este ticket.",
      },
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
  }, [comments, hasProgrammedTechnician, isAssignedToMe, ticket]);

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

    if (nextStatus === "en_proceso") {
      if (!hasProgrammedTechnician || !hasScheduledVisit) {
        notifications.warning({
          title: "Falta programacion",
          description: "No se puede iniciar la atencion sin programar un tecnico (visita tecnica).",
        });
        return;
      }
      if (!isAssignedToMe) {
        notifications.warning({
          title: "Accion restringida",
          description: "Solo el tecnico asignado puede iniciar la atencion.",
        });
        return;
      }
    }

    setStatusUpdating(true);
    try {
      const updated = await updateTicketStatus(companyId, ticketId, nextStatus, userId);
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
    if (!companyId || !ticketId || !visitStart || !visitTechnician) return;
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

      await loadTicket();
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
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">Ticket</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-900">{ticket.code}</h1>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
                  ticket.status
                )}`}
              >
                {statusLabel(ticket.status)}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{ticket.description}</p>

            <div className="mt-4 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-700">
                <User size={14} className="text-slate-400" />
                <span className="font-semibold">Tecnico:</span>
                <span>
                  {assignedTechnicianName ?? (assignedTechnicianId ? assignedTechnicianId.slice(0, 8) : "Sin programar")}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-700">
                <Calendar size={14} className="text-slate-400" />
                <span className="font-semibold">Visita:</span>
                <span>{latestVisit?.scheduledStart ? formatDateTime(latestVisit.scheduledStart) : "Sin fecha"}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-700">
                <Clock size={14} className="text-slate-400" />
                <span className="font-semibold">SLA:</span>
                <span>{ticket.slaType}</span>
                <span className="text-slate-500">({formatDateTime(ticket.slaDueAt)})</span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={openVisitModal}
              disabled={!canScheduleVisit}
              className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
            >
              {scheduleButtonLabel}
            </Button>
            <Button
              type="button"
              onClick={() => navigate("/admin/tickets")}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              Volver
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">Estado y acciones</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
                  ticket.status
                )}`}
              >
                {statusLabel(ticket.status)}
              </span>
              {!hasProgrammedTechnician ? (
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  Falta tecnico
                </span>
              ) : null}
              {hasProgrammedTechnician && !isAssignedToMe ? (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  Solo tecnico asignado
                </span>
              ) : null}
            </div>

            {canUpdateStatus ? (
              <div className="mt-4 flex flex-col gap-2">
                <Button
                  type="button"
                  onClick={() => void handleStatusChange("en_proceso")}
                  disabled={
                    statusUpdating ||
                    ticket.status === "en_proceso" ||
                    ticket.status === "resuelto" ||
                    ticket.status === "cerrado" ||
                    !hasProgrammedTechnician ||
                    !hasScheduledVisit ||
                    !isAssignedToMe
                  }
                  className="border-amber-600 bg-amber-600 text-white hover:bg-amber-700"
                >
                  Iniciar atención
                </Button>
                <Button
                  type="button"
                  onClick={() => setCompleteModalOpen(true)}
                  disabled={
                    statusUpdating ||
                    ticket.status === "resuelto" ||
                    ticket.status === "cerrado" ||
                    !isAssignedToMe
                  }
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

            {!hasProgrammedTechnician ? (
              <p className="mt-3 text-xs text-slate-500">
                Programa una visita para asignar un tecnico antes de iniciar la atencion.
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">Visita tecnica</p>
            <div className="mt-3 grid gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-xs font-semibold text-slate-500">Inicio</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {latestVisit?.scheduledStart ? formatDateTime(latestVisit.scheduledStart) : "Sin fecha"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-xs font-semibold text-slate-500">Fin</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {latestVisit?.scheduledEnd ? formatDateTime(latestVisit.scheduledEnd) : "Sin fecha"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-xs font-semibold text-slate-500">Tecnico</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {assignedTechnicianName ?? (assignedTechnicianId ? assignedTechnicianId.slice(0, 8) : "Sin programar")}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">Detalles</p>
            <div className="mt-3 grid gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-xs font-semibold text-slate-500">Categoria</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {ticket.categoryName ?? ticket.categoryId.slice(0, 6)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-xs font-semibold text-slate-500">Creado</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatDateTime(ticket.createdAt)}</p>
              </div>
            </div>
          </section>
        </aside>

        <main className="space-y-4 lg:col-span-2">
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">Comentarios</h2>
              <span className="text-xs text-slate-500">{comments.length} en total</span>
            </div>

            {comments.length === 0 ? (
              <EmptyState text="Aun no hay comentarios." />
            ) : (
              <div className="mt-4 space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{comment.authorName ?? "Soporte"}</span>
                      <span>{formatDateTime(comment.createdAt)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{comment.body}</p>
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
        </main>
      </div>

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
        title={scheduleButtonLabel}
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
              disabled={!canScheduleVisit || visitSubmitting || !visitStart || !visitTechnician}
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
              <option value="">Selecciona un tecnico</option>
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
