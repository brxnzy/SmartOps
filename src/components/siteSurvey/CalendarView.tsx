import { useCallback, useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import esLocale from "@fullcalendar/core/locales/es";
import type { EventClickArg } from "@fullcalendar/core";
import { CalendarClock, Play, RefreshCcw } from "lucide-react";
import Button from "../Button";
import { notifications } from "../../services/notification.service";
import { listTechnicianVisits, startSurveyVisit } from "../../services/siteSurveyExecution.service";
import type { SurveyCalendarEvent } from "../../types/siteSurveyExecution.types";

interface CalendarViewProps {
  technicianId: string;
  onOpenSurvey: (surveyId: string) => void;
}

function isStartAllowed(start: string): boolean {
  return Date.now() >= new Date(start).getTime();
}

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

export default function CalendarView({ technicianId, onOpenSurvey }: CalendarViewProps) {
  const [visits, setVisits] = useState<SurveyCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<SurveyCalendarEvent | null>(null);
  const [starting, setStarting] = useState(false);

  const loadVisits = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await listTechnicianVisits(technicianId);
      setVisits(data);
      if (selectedVisit) {
        const refreshed = data.find((visit) => visit.visitId === selectedVisit.visitId) ?? null;
        setSelectedVisit(refreshed);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudieron cargar las visitas tecnicas.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedVisit, technicianId]);

  useEffect(() => {
    void loadVisits();
  }, [loadVisits]);

  const events = useMemo(() => {
    return visits.map((visit) => {
      const colors = getStatusColor(visit.status);
      const startDate = visit.scheduledStart;
      const endDate = visit.scheduledEnd
        ? visit.scheduledEnd
        : new Date(new Date(startDate).getTime() + 60 * 60 * 1000).toISOString();

      return {
        id: String(visit.visitId),
        title: `${visit.customerName ?? "Cliente"} · ${visit.siteName ?? "Sitio"}`,
        start: startDate,
        end: endDate,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        textColor: "#ffffff",
        extendedProps: {
          visitId: visit.visitId,
          surveyId: visit.surveyId,
          status: visit.status,
          ticketId: visit.ticketId,
        },
      };
    });
  }, [visits]);

  const handleEventClick = (event: EventClickArg) => {
    const visitId = Number(event.event.extendedProps.visitId);
    const visit = visits.find((entry) => entry.visitId === visitId) ?? null;
    setSelectedVisit(visit);
  };

  const handleStartVisit = async () => {
    if (!selectedVisit) return;

    setStarting(true);
    try {
      await startSurveyVisit(selectedVisit.visitId, selectedVisit.surveyId);
      notifications.success({
        title: "Levantamiento iniciado",
        description: "La visita tecnica fue marcada como En Progreso.",
      });
      await loadVisits();
      onOpenSurvey(selectedVisit.surveyId);
    } catch (err) {
      notifications.error({
        title: "Error iniciando levantamiento",
        description: err instanceof Error ? err.message : "No se pudo iniciar el levantamiento.",
      });
    } finally {
      setStarting(false);
    }
  };

  const canStart = selectedVisit ? isStartAllowed(selectedVisit.scheduledStart) : false;

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Agenda Tecnica</h1>
        <p className="mt-1 text-sm text-slate-600">
          Visualiza tus visitas tecnicas por dia o semana y abre cada levantamiento directamente.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
            <CalendarClock size={16} className="text-slate-500" />
            Calendario de visitas
          </h2>

          <Button
            type="button"
            onClick={() => void loadVisits()}
            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            icon={<RefreshCcw size={14} />}
            disabled={loading}
          >
            Recargar
          </Button>
        </div>

        {error ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="smartops-calendar mt-4 rounded-2xl border border-slate-200 bg-white p-3">
          <FullCalendar
            plugins={[timeGridPlugin, interactionPlugin]}
            locale={esLocale}
            initialView="timeGridWeek"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "timeGridDay,timeGridWeek",
            }}
            buttonText={{
              today: "Hoy",
              day: "Dia",
              week: "Semana",
            }}
            allDaySlot={false}
            slotMinTime="00:00:00"
            slotMaxTime="24:00:00"
            nowIndicator
            eventClick={handleEventClick}
            events={events}
            height="auto"
            eventContent={(arg) => (
              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold leading-tight">{arg.event.title}</p>
                <p className="text-[10px] leading-tight text-white/90">{arg.timeText}</p>
                <p className="text-[10px] leading-tight text-white/90">
                  {(arg.event.extendedProps?.status as string | undefined) ?? "Pendiente"}
                </p>
              </div>
            )}
          />
        </div>

        {loading ? (
          <p className="mt-2 text-xs text-slate-500">Cargando visitas tecnicas...</p>
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
              <span className="font-medium">Inicio:</span> {new Date(selectedVisit.scheduledStart).toLocaleString("es-DO")}
            </p>
            <p>
              <span className="font-medium">Estado:</span> {selectedVisit.status ?? "Pendiente"}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => onOpenSurvey(selectedVisit.surveyId)}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              Abrir levantamiento
            </Button>

            {canStart ? (
              <Button
                type="button"
                onClick={() => void handleStartVisit()}
                disabled={starting}
                className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                icon={<Play size={14} />}
              >
                {starting ? "Iniciando..." : "Iniciar levantamiento"}
              </Button>
            ) : (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">
                Disponible a partir de {new Date(selectedVisit.scheduledStart).toLocaleString("es-DO")}
              </span>
            )}
          </div>
        </article>
      ) : null}
    </section>
  );
}
