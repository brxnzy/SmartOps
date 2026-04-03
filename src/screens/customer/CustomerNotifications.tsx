import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { listCustomerNotifications, type CustomerNotification } from "../../services/customerNotification.service";

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("es-DO");
}

function resolveLink(notification: CustomerNotification, origin: string): string | null {
  if (notification.actionUrl) {
    if (notification.actionUrl.startsWith(origin)) {
      return notification.actionUrl.replace(origin, "");
    }
    return notification.actionUrl;
  }

  if (notification.entityType === "budget" && notification.entityId) {
    return `/customer/quotes/${notification.entityId}`;
  }

  if (notification.entityType === "delivery_act" && notification.entityId) {
    return `/acta/${notification.entityId}`;
  }

  return null;
}

function statusBadge(status: CustomerNotification["status"]): string {
  if (status === "sent") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "failed") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function CustomerNotifications() {
  const { authUser } = useAuth();
  const navigate = useNavigate();
  const email = authUser?.email ?? null;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<CustomerNotification[]>([]);

  const loadNotifications = useCallback(async () => {
    if (!email) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await listCustomerNotifications(email);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las notificaciones.");
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const cards = useMemo(() => items.map((item) => {
    const link = resolveLink(item, origin);
    return { ...item, link };
  }), [items, origin]);

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-300">Notificaciones</p>
            <h1 className="mt-2 text-2xl font-semibold">Novedades para ti</h1>
            <p className="mt-1 text-sm text-slate-200">Cotizaciones, actas y mensajes importantes en un solo lugar.</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <Bell className="h-6 w-6" />
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {loading ? (
          <div className="text-sm text-slate-500">Cargando notificaciones...</div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
        ) : cards.length === 0 ? (
          <div className="text-sm text-slate-500">No tienes notificaciones pendientes.</div>
        ) : (
          <div className="space-y-3">
            {cards.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                    <p className="text-sm text-slate-600">{item.message}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadge(item.status)}`}>
                    {item.status === "sent" ? "Enviado" : item.status === "failed" ? "Fallido" : "Pendiente"}
                  </span>
                </div>
                {item.link ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (item.link?.startsWith("http")) {
                        window.open(item.link, "_blank", "noreferrer");
                      } else {
                        navigate(item.link as string);
                      }
                    }}
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Ver detalle
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
