/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import { PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import Modal from "../../components/Modal";
import CustomerTicketForm from "../../components/tickets/CustomerTicketForm";
import { useAuth } from "../../hooks/useAuth";
import { listCustomerTickets } from "../../services/tickets.service";
import type { TicketListItem, TicketStatus } from "../../types/ticketing.types";

const STATUS_LABELS: Record<TicketStatus, string> = {
  abierto: "Abierto",
  en_proceso: "En proceso",
  esperando_cliente: "Esperando cliente",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
};

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

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3).trim()}...`;
}

function statusBadgeClass(status: TicketStatus): string {
  if (status === "abierto") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "en_proceso") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "esperando_cliente") return "bg-purple-50 text-purple-700 border-purple-200";
  if (status === "resuelto") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export default function CustomerTickets() {
  const navigate = useNavigate();
  const { companyProfile, authUser } = useAuth();
  const companyId = companyProfile?.id ?? null;
  const customerId = authUser?.id ?? null;
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (!companyId || !customerId) {
      setTickets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    listCustomerTickets(companyId, customerId)
      .then((data) => {
        if (!active) return;
        setTickets(data);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "No se pudieron cargar los tickets.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [companyId, customerId]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (statusFilter !== "all" && ticket.status !== statusFilter) return false;
      if (!query) return true;
      return (
        ticket.code.toLowerCase().includes(query) ||
        ticket.description.toLowerCase().includes(query) ||
        (ticket.categoryName ?? "").toLowerCase().includes(query)
      );
    });
  }, [tickets, statusFilter, search]);

  const summary = useMemo(() => {
    const base = {
      total: tickets.length,
      abierto: 0,
      en_proceso: 0,
      esperando_cliente: 0,
      resuelto: 0,
      cerrado: 0,
    };
    tickets.forEach((ticket) => {
      base[ticket.status] += 1;
    });
    return base;
  }, [tickets]);

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Mis tickets</h1>
          <p className="mt-1 text-sm text-slate-500">Monitorea el estado de tus averias.</p>
        </div>
        <Button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
          icon={<PlusCircle size={16} />}
        >
          Nuevo ticket
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.total}</p>
          <p className="text-xs text-slate-500">Tickets registrados</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Abiertos</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.abierto}</p>
          <p className="text-xs text-blue-700">Requieren atencion</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">En proceso</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.en_proceso}</p>
          <p className="text-xs text-amber-700">Equipo trabajando</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Resueltos</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.resuelto}</p>
          <p className="text-xs text-emerald-700">Listos para cerrar</p>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-slate-500">Buscar</label>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por codigo, descripcion o categoria"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Estado</label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as TicketStatus | "all")}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
          >
            <option value="all">Todos</option>
            <option value="abierto">Abierto</option>
            <option value="en_proceso">En proceso</option>
            <option value="esperando_cliente">Esperando cliente</option>
            <option value="resuelto">Resuelto</option>
            <option value="cerrado">Cerrado</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Cargando tickets...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <EmptyState text="No hay tickets para mostrar." />
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-200 table-auto text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Codigo</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Descripcion</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">SLA</th>
                  <th className="px-4 py-3">Creado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-semibold text-slate-900">{ticket.code}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {ticket.categoryName ?? ticket.categoryId.slice(0, 6)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {truncateText(ticket.description, 80)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
                          ticket.status
                        )}`}
                      >
                        {STATUS_LABELS[ticket.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{ticket.slaType.toUpperCase()}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(ticket.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        onClick={() => navigate(`/customer/tickets/${ticket.id}`)}
                        className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                      >
                        Ver detalle
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nuevo ticket"
        subtitle="Describe la averia y adjunta evidencias si aplica."
        size="xl"
        containerClassName="overflow-hidden border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50"
        headerClassName="border-b border-slate-100 bg-white/80 px-6 py-5 backdrop-blur"
        bodyClassName="bg-transparent px-6 py-6"
      >
        <CustomerTicketForm
          onCancel={() => setCreateOpen(false)}
          onSuccess={(ticket) => {
            setCreateOpen(false);
            navigate(`/customer/tickets/${ticket.id}`);
          }}
          submitLabel="Crear ticket"
        />
      </Modal>
    </section>
  );
}
