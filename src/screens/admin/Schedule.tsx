import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { PERMISSIONS } from "../../constants/permissions";
import { useAuth } from "../../hooks/useAuth";
import { listSiteSurveys } from "../../services/siteSurvey.service";
import Button from "../../components/Button";
import type { SiteSurveySummary } from "../../types/siteSurvey.types";

function toLocalDateString(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function Schedule() {
  const { companyProfile, canAccess } = useAuth();
  const companyId = companyProfile?.id ?? null;
  const canReadSurveys = canAccess(PERMISSIONS.siteSurveyRead);

  const [surveys, setSurveys] = useState<SiteSurveySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSurveys = useCallback(async () => {
    if (!companyId || !canReadSurveys) {
      setSurveys([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await listSiteSurveys(companyId);
      setSurveys(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error cargando levantamientos.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [companyId, canReadSurveys]);

  useEffect(() => {
    void loadSurveys();
  }, [loadSurveys]);

  const calendarEvents = useMemo(() => {
    return surveys
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
          },
        };
      });
  }, [surveys]);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-800">Agenda</h1>
        <p className="mt-2 text-slate-600">
          Vista general de eventos en calendario.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Calendario general</h2>
            <div className="mt-2 flex items-center gap-4 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                Levantamiento
              </span>
            </div>
          </div>
          {error ? (
            <Button
              type="button"
              onClick={() => void loadSurveys()}
              className="border-red-300 bg-white text-red-700 hover:bg-red-100"
            >
              Reintentar
            </Button>
          ) : null}
        </div>

        {!canReadSurveys ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            No tienes permisos para ver levantamientos en la agenda.
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="smartops-calendar mt-4 rounded-2xl border border-slate-200 bg-white p-3">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            initialDate={new Date()}
            locale={esLocale}
            eventContent={(arg) => {
              const technicianName = arg.event.extendedProps?.technicianName as string | undefined;
              return (
                <div className="space-y-0.5">
                  <p className="text-[11px] font-semibold leading-tight">{arg.event.title}</p>
                  {technicianName ? (
                    <p className="text-[10px] leading-tight text-white/90">
                      Tecnico: {technicianName}
                    </p>
                  ) : null}
                </div>
              );
            }}
            selectable={false}
            editable={false}
            height="auto"
            events={calendarEvents}
          />
        </div>

        {loading ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <CalendarDays size={14} className="text-slate-400" />
            Cargando levantamientos...
          </div>
        ) : null}
      </div>
    </section>
  );
}
