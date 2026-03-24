import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import esLocale from "@fullcalendar/core/locales/es";
import type { EventClickArg } from "@fullcalendar/core";
import { CalendarDays } from "lucide-react";
import Button from "../../components/Button";
import { PERMISSIONS } from "../../constants/permissions";
import { useAuth } from "../../hooks/useAuth";
import { listSiteSurveys } from "../../services/siteSurvey.service";
import { listTicketTechnicalVisits } from "../../services/tickets.service";
import Button from "../../components/Button";
import type { SiteSurveySummary } from "../../types/siteSurvey.types";
import type { TechnicalVisitSummary } from "../../types/ticketing.types";

function toLocalDateString(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
import { listCompanyVisits } from "../../services/siteSurveyExecution.service";
import type { SurveyCalendarEvent } from "../../types/siteSurveyExecution.types";

function getStatusColor(status: string | null): { bg: string; border: string } {
  const normalized = (status ?? "").trim().toLowerCase();

  if (normalized.includes("complet")) {
    return { bg: "#16a34a", border: "#15803d" };
  }

  if (normalized.includes("progreso")) {
    return { bg: "#2563eb", border: "#1d4ed8" };
  }

  return { bg: "#ea580c", border: "#c2410c" };
}

function formatShortDate(value?: string | null): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Intl.DateTimeFormat("es-DO", { day: "2-digit", month: "short" }).format(
    new Date(timestamp)
  );
}

export default function Schedule() {
  const navigate = useNavigate();
  const { companyProfile, canAccess } = useAuth();
  const companyId = companyProfile?.id ?? null;
  const canReadSurveys = canAccess(PERMISSIONS.siteSurveyRead);
  const canReadTickets = canAccess(PERMISSIONS.ticketsRead);

  const [surveys, setSurveys] = useState<SiteSurveySummary[]>([]);
  const [ticketVisits, setTicketVisits] = useState<TechnicalVisitSummary[]>([]);
  const [visits, setVisits] = useState<SurveyCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<SurveyCalendarEvent | null>(null);

  const loadSchedule = useCallback(async () => {
    if (!companyId || (!canReadSurveys && !canReadTickets)) {
      setSurveys([]);
      setTicketVisits([]);
  const loadVisits = useCallback(async () => {
    if (!companyId || !canReadSurveys) {
      setVisits([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [surveyResult, ticketResult] = await Promise.all([
        canReadSurveys ? listSiteSurveys(companyId) : Promise.resolve([]),
        canReadTickets ? listTicketTechnicalVisits(companyId) : Promise.resolve([]),
      ]);
      setSurveys(surveyResult);
      setTicketVisits(ticketResult);
      const data = await listCompanyVisits(companyId);
      setVisits(data);

      if (selectedVisit) {
        const next = data.find((visit) => visit.visitId === selectedVisit.visitId) ?? null;
        setSelectedVisit(next);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error cargando agenda.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [companyId, canReadSurveys, canReadTickets]);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  const calendarEvents = useMemo(() => {
    const surveyEvents = surveys
      .filter((survey) => survey.scheduledStart)
      .map((survey) => {
        const dateOnly = toLocalDateString(survey.scheduledStart);
        return {
          id: survey.visitId ? String(survey.visitId) : survey.id,
          title: `${survey.customerName ?? "Cliente"} - ${survey.siteName ?? "Sitio"}`,
          start: dateOnly ?? survey.scheduledStart ?? undefined,
          allDay: true,
          backgroundColor: "#3b82f6",
          borderColor: "#2563eb",
          textColor: "#ffffff",
          extendedProps: {
            technicianName: survey.technicianName ?? "Sin tecnico",
            eventType: "survey",
          },
        };
      });

    const ticketEvents = ticketVisits
      .filter((visit) => visit.scheduledStart && visit.ticketId)
      .map((visit) => {
        const dateOnly = toLocalDateString(visit.scheduledStart);
        return {
          id: `ticket-${visit.id}`,
          title: visit.siteName ?? "Sitio",
          start: dateOnly ?? visit.scheduledStart ?? undefined,
          allDay: true,
          backgroundColor: "#f59e0b",
          borderColor: "#d97706",
          textColor: "#ffffff",
          extendedProps: {
            technicianName: visit.technicianName ?? "Sin tecnico",
            scheduledEnd: visit.scheduledEnd ?? null,
            eventType: "ticket",
          },
        };
      });

    return [...surveyEvents, ...ticketEvents];
  }, [surveys, ticketVisits]);
  }, [canReadSurveys, companyId, selectedVisit]);

  useEffect(() => {
    void loadVisits();
  }, [loadVisits]);

  const events = useMemo(() => {
    return visits.map((visit) => {
      const colors = getStatusColor(visit.status);
      const endDate = visit.scheduledEnd
        ? visit.scheduledEnd
        : new Date(new Date(visit.scheduledStart).getTime() + 60 * 60 * 1000).toISOString();

      return {
        id: String(visit.visitId),
        title: `${visit.customerName ?? "Cliente"} · ${visit.siteName ?? "Sitio"}`,
        start: visit.scheduledStart,
        end: endDate,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        textColor: "#ffffff",
        extendedProps: {
          surveyId: visit.surveyId,
          technicianName: visit.technicianName ?? "Sin tecnico",
          status: visit.status ?? "Pendiente",
        },
      };
    });
  }, [visits]);

  const onEventClick = (arg: EventClickArg) => {
    const visitId = Number(arg.event.id);
    const found = visits.find((visit) => visit.visitId === visitId) ?? null;
    setSelectedVisit(found);
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
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                En progreso
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                Pendiente
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Completada
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                Ticket
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
            onClick={() => void loadVisits()}
            disabled={loading}
            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
          >
            Recargar
          </Button>
        </div>

        {!canReadSurveys && !canReadTickets ? (
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
            selectable={false}
            editable={false}
            events={events}
            eventClick={onEventClick}
            height="auto"
            eventContent={(arg) => {
              const technicianName = arg.event.extendedProps?.technicianName as string | undefined;
              const scheduledEnd = arg.event.extendedProps?.scheduledEnd as string | undefined;
              const eventType = arg.event.extendedProps?.eventType as string | undefined;
              if (eventType === "ticket") {
                const endLabel = formatShortDate(scheduledEnd);
                return (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-semibold leading-tight">{arg.event.title}</span>
                    {technicianName ? (
                      <span className="text-[10px] leading-tight text-white/90">
                        Técnico: {technicianName}
                      </span>
                    ) : null}
                    {endLabel ? (
                      <span className="text-[10px] leading-tight text-white/90">
                        Finaliza: {endLabel}
                      </span>
                    ) : null}
                  </div>
                );
              }
              const status = arg.event.extendedProps?.status as string | undefined;

              return (
                <div className="space-y-0.5">
                  <p className="text-[11px] font-semibold leading-tight">{arg.event.title}</p>
                  <p className="text-[10px] leading-tight text-white/90">{technicianName}</p>
                  <p className="text-[10px] leading-tight text-white/90">{status}</p>
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
      </div>

      {selectedVisit ? (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Visita seleccionada</h3>
          <div className="mt-2 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
            <p>
              <span className="font-medium">Cliente:</span> {selectedVisit.customerName ?? "Sin nombre"}
            </p>
            <p>
              <span className="font-medium">Sitio:</span> {selectedVisit.siteName ?? "Sin nombre"}
            </p>
            <p>
              <span className="font-medium">Tecnico:</span> {selectedVisit.technicianName ?? "Sin tecnico"}
            </p>
            <p>
              <span className="font-medium">Estado:</span> {selectedVisit.status ?? "Pendiente"}
            </p>
            <p>
              <span className="font-medium">Inicio:</span> {new Date(selectedVisit.scheduledStart).toLocaleString("es-DO")}
            </p>
            <p>
              <span className="font-medium">Fin:</span> {selectedVisit.scheduledEnd ? new Date(selectedVisit.scheduledEnd).toLocaleString("es-DO") : "No definido"}
            </p>
          </div>

          <div className="mt-3">
            <Button
              type="button"
              onClick={() => navigate(`/admin/site_surveys/${selectedVisit.surveyId}`)}
              className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
            >
              Abrir levantamiento
            </Button>
          </div>
        </article>
      ) : null}
    </section>
  );
}
