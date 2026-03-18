/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { Paperclip, Send } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import Field from "../../components/Field";
import Modal from "../../components/Modal";
import { useAuth } from "../../hooks/useAuth";
import {
  addTicketComment,
  assignTicket,
  createTicketVisit,
  getTicketDetail,
  listTechnicians,
  updateTicketStatus,
} from "../../services/tickets.service";
import type { TicketComment, TicketListItem, TicketStatus } from "../../types/ticketing.types";

const STATUS_OPTIONS: Array<{ value: TicketStatus; label: string }> = [
  { value: "abierto", label: "Abierto" },
  { value: "en_proceso", label: "En proceso" },
  { value: "esperando_cliente", label: "Esperando cliente" },
  { value: "resuelto", label: "Resuelto" },
  { value: "cerrado", label: "Cerrado" },
];

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
  const { companyProfile, authUser } = useAuth();
  const companyId = companyProfile?.id ?? null;
  const userId = authUser?.id ?? null;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TicketListItem | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [attachments, setAttachments] = useState<Array<{ name: string; url?: string }>>([]);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [technicians, setTechnicians] = useState<Array<{ id: string; name: string }>>([]);
  const [statusValue, setStatusValue] = useState<TicketStatus>("abierto");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [commentText, setCommentText] = useState("");
  const [commentInternal, setCommentInternal] = useState(false);
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [visitDate, setVisitDate] = useState("");
  const [visitTechnician, setVisitTechnician] = useState("");
  const [visitDiagnosis, setVisitDiagnosis] = useState("");
  const [visitResolution, setVisitResolution] = useState("");

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
      setStatusValue(data.ticket.status);
      setAssignedTo(data.ticket.assignedTo ?? "");
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
    if (!companyId) return;
    listTechnicians(companyId)
      .then(setTechnicians)
      .catch(() => setTechnicians([]));
  }, [companyId]);

  const handleStatusUpdate = async () => {
    if (!ticketId) return;
    setSubmitting(true);
    try {
      await updateTicketStatus(ticketId, statusValue);
      await loadTicket();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el estado.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async () => {
    if (!ticketId) return;
    setSubmitting(true);
    try {
      await assignTicket(ticketId, assignedTo || null);
      await loadTicket();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo asignar el tecnico.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleComment = async () => {
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

  const handleVisitSchedule = async () => {
    if (!companyId || !ticketId || !visitDate) return;
    setSubmitting(true);
    try {
      await createTicketVisit(companyId, ticketId, {
        technicianId: visitTechnician || null,
        scheduledAt: new Date(visitDate).toISOString(),
        diagnosis: visitDiagnosis.trim() || null,
        resolution: visitResolution.trim() || null,
      });
      setVisitDate("");
      setVisitTechnician("");
      setVisitDiagnosis("");
      setVisitResolution("");
      setVisitModalOpen(false);
      await loadTicket();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo programar la visita.");
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

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Estado</p>
          <select
            value={statusValue}
            onChange={(event) => setStatusValue(event.target.value as TicketStatus)}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button
            type="button"
            onClick={() => void handleStatusUpdate()}
            disabled={submitting}
            className="mt-3 w-full border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
          >
            Actualizar estado
          </Button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Categoria</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {ticket.categoryName ?? ticket.categoryId.slice(0, 6)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Asignar tecnico</p>
          <select
            value={assignedTo}
            onChange={(event) => setAssignedTo(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
          >
            <option value="">Sin asignar</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name}
              </option>
            ))}
          </select>
          <Button
            type="button"
            onClick={() => void handleAssign()}
            disabled={submitting}
            className="mt-3 w-full border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
          >
            Guardar asignacion
          </Button>
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
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
            />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={commentInternal}
                onChange={(event) => setCommentInternal(event.target.checked)}
              />
              Comentario interno
            </label>
            <input
              type="file"
              multiple
              onChange={(event) => setCommentFiles(Array.from(event.target.files ?? []))}
              className="text-xs text-slate-500"
            />
            <Button
              type="button"
              onClick={() => void handleComment()}
              disabled={submitting}
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
        title="Programar visita técnica"
        subtitle="Coordina fecha, técnico y notas iniciales."
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
              disabled={submitting}
              className="border-slate-200 bg-transparent text-slate-500 hover:bg-slate-100 font-medium text-sm"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleVisitSchedule()}
              disabled={submitting || !visitDate}
              className="border-0 bg-blue-600 text-white hover:bg-blue-800 font-medium text-sm"
            >
              Guardar visita
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5 py-6">

          {/* Fila: fecha y técnico */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Fecha y hora
              </label>
              <input
                type="datetime-local"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="w-full h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Técnico
              </label>
              <select
                value={visitTechnician}
                onChange={(e) => setVisitTechnician(e.target.value)}
                className="w-full h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 appearance-none cursor-pointer"
              >
                <option value="">Sin asignar</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>{tech.name}</option>
                ))}
              </select>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Notas opcionales */}
          <div className="flex flex-col gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Diagnóstico inicial{" "}
                <span className="font-normal text-slate-400">opcional</span>
              </label>
              <input
                value={visitDiagnosis}
                onChange={(e) => setVisitDiagnosis(e.target.value)}
                placeholder="Ej: Revisión de sensores"
                className="w-full h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Solución estimada{" "}
                <span className="font-normal text-slate-400">opcional</span>
              </label>
              <input
                value={visitResolution}
                onChange={(e) => setVisitResolution(e.target.value)}
                placeholder="Ej: Recalibrar equipo"
                className="w-full h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>

        </div>
      </Modal>
    </section>
  );
}
