import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";

export default function Schedule() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-800">Agenda</h1>
        <p className="mt-2 text-slate-600">
          Vista general de eventos en calendario.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          initialDate={new Date()}
          locale={esLocale}
          eventContent={(arg) => (
            <div
              title={arg.event.title}
              style={{
                whiteSpace: "normal",
                overflow: "visible",
                textOverflow: "clip",
                lineHeight: "1.15",
              }}
            >
              {arg.event.title}
            </div>
          )}
          selectable={true}
          editable={true}
          height="auto"
          events={[
            {
              id: "1",
              title: "Reunion - Equipo",
              start: "2026-03-18T10:00:00",
              end: "2026-03-18T11:00:00",
            },
          ]}
        />
      </div>
    </section>
  );
}
