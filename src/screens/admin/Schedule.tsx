import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import FullCalendar from "@fullcalendar/react";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import esLocale from "@fullcalendar/core/locales/es";
import type { EventClickArg } from "@fullcalendar/core";
import { CalendarDays } from "lucide-react";
import Button from "../../components/Button";
import Field from "../../components/Field";
import Modal from "../../components/Modal";
import { PERMISSIONS } from "../../constants/permissions";
import { useAuth } from "../../hooks/useAuth";
import { notifications } from "../../services/notification.service";
import {
  cancelSiteSurvey,
  cancelTechnicalVisit,
  listCompanyVisits,
  rescheduleTechnicalVisit,
} from "../../services/siteSurveyExecution.service";
import type { SurveyCalendarEvent } from "../../types/siteSurveyExecution.types";
import {
  canCancelSurveyStatus,
  canCancelVisitStatus,
  canRescheduleVisitStatus,
  formatSurveyStatusLabel,
  formatVisitStatusLabel,
  normalizeSurveyStatus,
} from "../../utils/siteSurveyWorkflow";

type EventPalette = { bg: string; border: string; dot: string };
const TYPE_PALETTE: Record<"survey" | "ticket" | "installation", EventPalette> = {
  survey: { bg: "#2563eb", border: "#1d4ed8", dot: "#3b82f6" },
  ticket: { bg: "#d97706", border: "#b45309", dot: "#f59e0b" },
  installation: { bg: "#0f766e", border: "#0f766e", dot: "#14b8a6" },
};

function resolveVisitType(visit: SurveyCalendarEvent): "survey" | "ticket" | "installation" {
  if (visit.installationProjectId) return "installation";
  if (visit.ticketId) return "ticket";
  return "survey";
}

function formatShortDate(value?: string | null): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Intl.DateTimeFormat("es-DO", { day: "2-digit", month: "short" }).format(
    new Date(timestamp)
  );
}

function toDateTimeLocalMinValue(value = new Date()): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function Schedule() {
  const { companyProfile, canAccess } = useAuth();
  const companyId = companyProfile?.id ?? null;
  const canReadSchedule = canAccess(PERMISSIONS.scheduleRead);
  const canReadSurveys = canAccess(PERMISSIONS.siteSurveyRead);
  const canReadTickets = canAccess(PERMISSIONS.ticketsRead);
  const canReadInstallations = canAccess(PERMISSIONS.installationProjectsRead);
  const canCancelVisit = canAccess(PERMISSIONS.technicalVisitsCancel);
  const canRescheduleVisit = canAccess(PERMISSIONS.technicalVisitsReschedule);
  const canCancelSurvey = canAccess(PERMISSIONS.siteSurveyCancel);

  const [visits, setVisits] = useState<SurveyCalendarEvent[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [cancelingVisitId, setCancelingVisitId] = useState<string | null>(null);
  const [cancelingSurveyId, setCancelingSurveyId] = useState<string | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleStart, setRescheduleStart] = useState("");
  const [rescheduleEnd, setRescheduleEnd] = useState("");
  const [reschedulingVisitId, setReschedulingVisitId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentDateTimeMin = useMemo(() => toDateTimeLocalMinValue(), []);
  const loadSchedule = useCallback(async () => {
    if (!companyId || !canReadSchedule || (!canReadSurveys && !canReadTickets && !canReadInstallations)) {
      setVisits([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await listCompanyVisits(companyId);
      setVisits(data);
      setSelectedVisitId((current) => (current && data.some((visit) => visit.visitId === current) ? current : null));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error cargando agenda.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [companyId, canReadInstallations, canReadSchedule, canReadSurveys, canReadTickets]);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  const selectedVisit = useMemo(
    () => visits.find((visit) => visit.visitId === selectedVisitId) ?? null,
    [selectedVisitId, visits]
  );

  const selectedVisitType = selectedVisit ? resolveVisitType(selectedVisit) : null;

  const selectedSurveyStatus = useMemo(
    () => normalizeSurveyStatus(selectedVisit?.surveyStatus ?? null),
    [selectedVisit?.surveyStatus]
  );

  const events = useMemo(() => {
    return visits.map((visit) => {
      const visitType = resolveVisitType(visit);
      const colors = TYPE_PALETTE[visitType];
      const endDate = visit.scheduledEnd
        ? visit.scheduledEnd
        : new Date(new Date(visit.scheduledStart).getTime() + 60 * 60 * 1000).toISOString();

      return {
        id: String(visit.visitId),
        title: `${visit.customerName ?? "Cliente"} - ${visit.siteName ?? "Sitio"}`,
        start: visit.scheduledStart,
        end: endDate,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        textColor: "#ffffff",
        extendedProps: {
          visitId: visit.visitId,
          surveyId: visit.surveyId,
          status: visit.status ?? null,
          visitType,
          name: `${visit.customerName ?? "Cliente"} - ${visit.siteName ?? "Sitio"}`,
          technicianName: visit.technicianName ?? "Sin tecnico",

          scheduledEnd: visit.scheduledEnd ?? null,
        },
      };
    });
  }, [visits]);

  const handleEventClick = (arg: EventClickArg) => {
    const visitId = String(arg.event.extendedProps?.visitId ?? arg.event.id);
    setSelectedVisitId(visitId);
  };

  const handleCancelVisit = async () => {
    if (!selectedVisit) return;
    if (!canCancelVisit) {
      notifications.warning({
        title: "Sin permisos",
        description: "No tienes permisos para cancelar visitas tecnicas.",
      });
      return;
    }
    if (!canCancelVisitStatus(selectedVisit.status)) {
      notifications.warning({
        title: "Estado no valido",
        description: "Solo se pueden cancelar visitas programadas o en progreso.",
      });
      return;
    }

    const confirmed = window.confirm(
      "Esta accion cancela solo la visita tecnica. No cancela el levantamiento, ticket ni instalacion. Deseas continuar?"
    );
    if (!confirmed) return;

    setCancelingVisitId(selectedVisit.visitId);
    try {
      await cancelTechnicalVisit(selectedVisit.visitId);
      notifications.success({
        title: "Visita cancelada",
        description: "La visita tecnica fue cancelada correctamente.",
      });
      await loadSchedule();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cancelar la visita tecnica.";
      notifications.error({
        title: "Error cancelando visita",
        description: message,
      });
      window.alert(message);
    } finally {
      setCancelingVisitId(null);
    }
  };

  const openRescheduleModal = () => {
    if (!selectedVisit) return;
    const toLocalValue = (value?: string | null) => {
      if (!value) return "";
      const date = new Date(value);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setRescheduleStart(toLocalValue(selectedVisit.scheduledStart));
    setRescheduleEnd(toLocalValue(selectedVisit.scheduledEnd));
    setRescheduleOpen(true);
  };

  const closeRescheduleModal = () => {
    if (reschedulingVisitId) return;
    setRescheduleOpen(false);
    setRescheduleStart("");
    setRescheduleEnd("");
  };

  const handleRescheduleVisit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedVisit) return;
    if (!canRescheduleVisit) {
      notifications.warning({
        title: "Sin permisos",
        description: "No tienes permisos para reprogramar visitas tecnicas.",
      });
      return;
    }
    if (!rescheduleStart) {
      notifications.warning({
        title: "Fecha requerida",
        description: "Debes indicar la fecha/hora de inicio.",
      });
      return;
    }

    if (Date.parse(rescheduleStart) < Date.now()) {
      notifications.warning({
        title: "Fecha invalida",
        description: "No puedes programar una visita en una fecha pasada.",
      });
      return;
    }

    const nextStart = new Date(rescheduleStart).toISOString();
    const nextEnd = rescheduleEnd ? new Date(rescheduleEnd).toISOString() : null;
    if (nextEnd && Date.parse(nextEnd) < Date.parse(nextStart)) {
      notifications.warning({
        title: "Rango invalido",
        description: "La fecha/hora fin debe ser mayor que inicio.",
      });
      return;
    }
    if (nextEnd && Date.parse(nextEnd) <= Date.parse(nextStart)) {
      notifications.warning({
        title: "Rango invalido",
        description: "La fecha/hora fin debe ser mayor que inicio.",
      });
      return;
    }

    setReschedulingVisitId(selectedVisit.visitId);
    try {
      await rescheduleTechnicalVisit({
        visitId: selectedVisit.visitId,
        scheduledStart: nextStart,
        scheduledEnd: nextEnd,
      });
      notifications.success({
        title: "Visita reprogramada",
        description: "Los cambios de agenda se guardaron correctamente.",
      });
      closeRescheduleModal();
      await loadSchedule();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo reprogramar la visita tecnica.";
      notifications.error({
        title: "Error reprogramando visita",
        description: message,
      });
      window.alert(message);
    } finally {
      setReschedulingVisitId(null);
    }
  };

  const handleCancelSurvey = async () => {
    if (!selectedVisit || selectedVisitType !== "survey") return;
    if (!selectedVisit.surveyId) return;
    if (!canCancelSurvey) {
      notifications.warning({
        title: "Sin permisos",
        description: "No tienes permisos para cancelar levantamientos.",
      });
      return;
    }
    if (!canCancelSurveyStatus(selectedSurveyStatus)) {
      notifications.warning({
        title: "Estado no valido",
        description: "Solo puedes cancelar levantamientos pendientes o en progreso.",
      });
      return;
    }

    const confirmed = window.confirm(
      "Se cancelara el levantamiento y sus visitas tecnicas activas. Deseas continuar?"
    );
    if (!confirmed) return;

    setCancelingSurveyId(selectedVisit.surveyId);
    try {
      await cancelSiteSurvey(selectedVisit.surveyId);
      notifications.success({
        title: "Levantamiento cancelado",
        description: "El levantamiento y sus visitas activas fueron cancelados.",
      });
      await loadSchedule();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cancelar el levantamiento.";
      notifications.error({
        title: "Error cancelando levantamiento",
        description: message,
      });
      window.alert(message);
    } finally {
      setCancelingSurveyId(null);
    }
  };

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-800">Agenda</h1>
        <p className="mt-2 text-slate-600">Calendario general por dia/semana con horario de visitas tecnicas.</p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Calendario de visitas</h2>
            <div className="mt-2 flex items-center gap-4 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TYPE_PALETTE.installation.dot }} />
                Instalacion
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TYPE_PALETTE.ticket.dot }} />
                Ticket
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TYPE_PALETTE.survey.dot }} />
                Levantamiento
              </span>
            </div>
          </div>
          {error ? (
            <Button
              type="button"
              onClick={() => void loadSchedule()}
              className="border-red-300 bg-white text-red-700 hover:bg-red-100"
            >
              Reintentar
            </Button>
          ) : null}

          <Button
            type="button"
            onClick={() => void loadSchedule()}
            disabled={loading}
            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
          >
            Recargar
          </Button>
        </div>

        {!canReadSchedule || (!canReadSurveys && !canReadTickets && !canReadInstallations) ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            No tienes permisos para ver eventos en la agenda.
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="smartops-calendar mt-4 rounded-2xl border border-slate-200 bg-white p-3">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            locale={esLocale}
            initialView="timeGridWeek"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "timeGridDay,timeGridWeek,dayGridMonth",
            }}
            buttonText={{
              today: "Hoy",
              day: "Dia",
              week: "Semana",
              month: "Mes",
            }}
            allDaySlot={false}
            slotMinTime="00:00:00"
            slotMaxTime="24:00:00"
            nowIndicator
            eventClick={handleEventClick}
            selectable={false}
            editable={false}
            eventDisplay="block"
            displayEventTime={false}
            events={events}
            height="auto"
            eventContent={(arg) => {
              const technicianName = arg.event.extendedProps?.technicianName as string | undefined;
              const scheduledEnd = arg.event.extendedProps?.scheduledEnd as string | undefined;
              const endLabel = formatShortDate(scheduledEnd);

              return (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: arg.event.backgroundColor as string }}
                    />
                    <p className="text-[10px] font-semibold leading-tight text-white/90">
                      {arg.event.extendedProps?.name as string | undefined}
                    </p>
                  </div>
                  {technicianName ? (
                    <p className="text-[10px] leading-tight text-white/90">Tecnico: {technicianName}</p>
                  ) : null}
                  {endLabel ? (
                    <p className="text-[10px] leading-tight text-white/90">Finaliza: {endLabel}</p>
                  ) : null}
                  <p className="text-[10px] leading-tight text-white/90">
                    {formatVisitStatusLabel(arg.event.extendedProps?.status as string | null | undefined)}
                  </p>
                </div>
              );
            }}
          />
        </div>

        {loading ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <CalendarDays size={14} className="text-slate-400" />
            Cargando agenda...
          </div>
        ) : null}

        {selectedVisit ? (
          <article className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Visita seleccionada</h3>
            <div className="mt-2 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
              <p>
                <span className="font-medium">Tipo:</span>{" "}
                {selectedVisitType === "survey"
                  ? "Levantamiento"
                  : selectedVisitType === "ticket"
                    ? "Ticket"
                    : "Instalacion"}
              </p>
              <p>
                <span className="font-medium">Estado:</span> {formatVisitStatusLabel(selectedVisit.status)}
              </p>
              {selectedVisitType === "survey" ? (
                <p>
                  <span className="font-medium">Estado levantamiento:</span>{" "}
                  {formatSurveyStatusLabel(selectedVisit.surveyStatus)}
                </p>
              ) : null}
              <p>
                <span className="font-medium">Cliente/Sitio:</span>{" "}
                {selectedVisit.customerName ?? "Cliente"} - {selectedVisit.siteName ?? "Sitio"}
              </p>
              <p>
                <span className="font-medium">Tecnico:</span> {selectedVisit.technicianName ?? "Sin tecnico"}
              </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {canRescheduleVisit &&
              canRescheduleVisitStatus(selectedVisit.status) &&
              !(selectedVisitType === "survey" && selectedSurveyStatus === "cancelado") ? (
                <Button
                  type="button"
                  onClick={openRescheduleModal}
                  className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                >
                  Reprogramar visita
                </Button>
              ) : null}

              {canCancelVisit && canCancelVisitStatus(selectedVisit.status) ? (
                <Button
                  type="button"
                  onClick={() => void handleCancelVisit()}
                  disabled={cancelingVisitId === selectedVisit.visitId}
                  className="border-rose-300 bg-white text-rose-700 hover:bg-rose-50"
                >
                  {cancelingVisitId === selectedVisit.visitId ? "Cancelando..." : "Cancelar visita tecnica"}
                </Button>
              ) : null}

              {selectedVisitType === "survey" &&
              canCancelSurvey &&
              selectedVisit.surveyId &&
              canCancelSurveyStatus(selectedSurveyStatus) ? (
                <Button
                  type="button"
                  onClick={() => void handleCancelSurvey()}
                  disabled={cancelingSurveyId === selectedVisit.surveyId}
                  className="border-rose-600 bg-rose-600 text-white hover:bg-rose-700"
                >
                  {cancelingSurveyId === selectedVisit.surveyId ? "Cancelando..." : "Cancelar levantamiento"}
                </Button>
              ) : null}
            </div>

            {selectedVisitType === "survey" && !canCancelVisitStatus(selectedVisit.status) ? (
              <div className="mt-3">
                <p className="text-xs text-slate-500">
                  Esta visita no puede cancelarse por su estado actual.
                </p>
              </div>
            ) : null}
          </article>
        ) : null}
      </div>

      <Modal
        open={rescheduleOpen}
        onClose={closeRescheduleModal}
        title="Reprogramar visita tecnica"
        subtitle="Actualiza fecha y hora de la visita seleccionada."
        footer={(
          <>
            <Button
              type="button"
              onClick={closeRescheduleModal}
              disabled={Boolean(reschedulingVisitId)}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="reschedule-visit-form"
              disabled={Boolean(reschedulingVisitId) || !rescheduleStart}
              className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
            >
              {reschedulingVisitId ? "Guardando..." : "Guardar cambios"}
            </Button>
          </>
        )}
      >
        <form id="reschedule-visit-form" onSubmit={handleRescheduleVisit} className="space-y-3">
          <Field label="Inicio">
            <input
              type="datetime-local"
              value={rescheduleStart}
              onChange={(event) => setRescheduleStart(event.target.value)}
              min={currentDateTimeMin}
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            />
          </Field>
          <Field label="Fin (opcional)">
            <input
              type="datetime-local"
              value={rescheduleEnd}
              onChange={(event) => setRescheduleEnd(event.target.value)}
              min={rescheduleStart || currentDateTimeMin}
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            />
          </Field>
        </form>
      </Modal>
    </section>
  );
}


//Sistema de turno que se muestre en pantalla
