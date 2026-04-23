import { useEffect, useMemo, useState } from "react";
import { Building2, Filter, LifeBuoy, RefreshCw, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import Input from "../../components/Input";
import { superadminListSupportRequests } from "../../services/support.service";

type SupportStatus = "open" | "in_progress" | "closed" | "all";
type SupportPriority = "low" | "medium" | "high" | "critical" | "all";

type SupportRequestRow = {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  status: Exclude<SupportStatus, "all">;
  priority: Exclude<SupportPriority, "all">;
  createdAt: string;
  lastActivityAt: string;
};

function statusBadgeClass(status: Exclude<SupportStatus, "all">): string {
  if (status === "open") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "in_progress") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "closed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function statusLabel(status: Exclude<SupportStatus, "all">): string {
  if (status === "open") return "Open";
  if (status === "in_progress") return "In progress";
  if (status === "closed") return "Closed";
  return status;
}

function formatDateTime(value: string): string {
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

export default function SuperAdminSupport() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SupportStatus>("all");
  const [priority, setPriority] = useState<SupportPriority>("all");
  const [requests, setRequests] = useState<SupportRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await superadminListSupportRequests({
        status,
        priority,
        search,
      });
      setRequests(data as SupportRequestRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar soporte.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, priority]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((item) => {
      if (status !== "all" && item.status !== status) return false;
      if (priority !== "all" && item.priority !== priority) return false;
      if (!query) return true;
      return (
        item.title.toLowerCase().includes(query) ||
        item.companyName.toLowerCase().includes(query)
      );
    });
  }, [priority, requests, search, status]);

  return (
    <section className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-linear-to-br from-slate-900 via-slate-800 to-cyan-900 p-6 text-white shadow-sm">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -bottom-20 left-8 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
            Superadmin
          </p>
          <h1 className="text-3xl font-semibold">Soporte</h1>
          <p className="max-w-2xl text-sm text-slate-200/90">
            Bandeja centralizada de solicitudes de soporte de todos los tenants.
          </p>
        </div>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <LifeBuoy size={16} className="text-slate-400" />
            <span>Solicitudes</span>
          </div>

          <div className="grid w-full gap-3 lg:max-w-5xl lg:grid-cols-4">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por tenant o título..."
              className="w-full"
              icon={<Search size={16} />}
            />
            <div>
              <label className="text-xs font-semibold text-slate-500">Estado</label>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <Filter size={16} className="text-slate-400" />
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as SupportStatus)}
                  className="w-full bg-transparent outline-none"
                >
                  <option value="all">Todos</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Prioridad</label>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <Filter size={16} className="text-slate-400" />
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as SupportPriority)}
                  className="w-full bg-transparent outline-none"
                >
                  <option value="all">Todas</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={() => void load()}
                className="w-full border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                icon={<RefreshCw size={16} />}
              >
                Recargar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          <p className="font-semibold">No se pudo cargar soporte</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Cargando solicitudes...
        </div>
      ) : null}

      {!loading && !error && filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <EmptyState text="No hay solicitudes de soporte por el momento." />
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Building2 size={14} className="text-slate-400" />
            <span>Cuando los tenants creen solicitudes, aparecerán aquí.</span>
          </div>
          <p className="mt-2 text-center text-xs text-slate-500">
            Si ya creaste solicitudes y no aparecen, verifica que la migración `support_requests` esté aplicada en Supabase
            (schema cache actualizado) y que tu usuario tenga rol SuperAdmin.
          </p>
        </div>
      ) : (
        !loading && !error ? <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-260 table-auto text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Prioridad</th>
                  <th className="px-4 py-3">Actividad</th>
                  <th className="px-4 py-3">Creada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer hover:bg-slate-50/80"
                    onClick={() => navigate(`/superadmin/support/${row.id}`)}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.companyName}</td>
                    <td className="px-4 py-3 text-slate-700">{row.title}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
                          row.status
                        )}`}
                      >
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.priority}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(row.lastActivityAt)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div> : null
      )}
    </section>
  );
}
