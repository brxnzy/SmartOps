import { useCallback, useEffect, useMemo, useState } from "react";
import { LifeBuoy, Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import Field from "../../components/Field";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import { useAuth } from "../../hooks/useAuth";
import { notifications } from "../../services/notification.service";
import { createSupportRequest, listCompanySupportRequests } from "../../services/support.service";
import type { SupportRequest, SupportRequestPriority, SupportRequestStatus, SupportRequestType } from "../../types/support.types";

function statusBadgeClass(status: SupportRequestStatus): string {
  if (status === "open") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "in_progress") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "closed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function statusLabel(status: SupportRequestStatus): string {
  if (status === "open") return "Abierta";
  if (status === "in_progress") return "En progreso";
  if (status === "closed") return "Cerrada";
  return status;
}

function priorityLabel(priority: SupportRequestPriority): string {
  if (priority === "low") return "Baja";
  if (priority === "medium") return "Media";
  if (priority === "high") return "Alta";
  if (priority === "critical") return "Crítica";
  return priority;
}

function typeLabel(type: SupportRequestType): string {
  if (type === "bug") return "Bug";
  if (type === "help") return "Ayuda";
  if (type === "emergency") return "Emergencia";
  return type;
}

function formatDate(value: string): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "Sin fecha";
  return new Intl.DateTimeFormat("es-DO", { year: "numeric", month: "short", day: "numeric" }).format(
    new Date(timestamp)
  );
}

export default function AdminSupport() {
  const navigate = useNavigate();
  const { companyProfile, authUser } = useAuth();
  const companyId = companyProfile?.id ?? null;
  const userId = authUser?.id ?? null;
  const [search, setSearch] = useState("");
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const loadRequests = useCallback(async () => {
    if (!companyId) {
      setRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await listCompanySupportRequests(companyId);
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las solicitudes.");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return requests;
    return requests.filter((item) => item.title.toLowerCase().includes(query));
  }, [requests, search]);

  const handleCreate = async () => {
    if (!companyId || !userId) return;
    if (!createTitle.trim() || !createDescription.trim()) return;

    setCreateSubmitting(true);
    try {
      const created = await createSupportRequest({
        companyId,
        createdBy: userId,
        type: "help",
        priority: "medium",
        title: createTitle.trim(),
        description: createDescription.trim(),
      });
      notifications.success({
        title: "Solicitud creada",
        description: "Tu solicitud fue enviada al equipo de soporte.",
      });
      setCreateOpen(false);
      setCreateTitle("");
      setCreateDescription("");
      await loadRequests();
      navigate(`/admin/support/${created.id}`);
    } catch (err) {
      notifications.error({
        title: "No se pudo crear",
        description: err instanceof Error ? err.message : "No se pudo crear la solicitud.",
      });
    } finally {
      setCreateSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-linear-to-br from-slate-900 via-slate-800 to-indigo-900 p-6 text-white shadow-sm">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="absolute -bottom-20 left-8 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200/80">
              Soporte
            </p>
            <h1 className="text-3xl font-semibold">Centro de soporte</h1>
            <p className="max-w-2xl text-sm text-slate-200/90">
              Crea solicitudes y conversa con el SuperAdmin para resolver incidencias del sistema.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="border-white/15 bg-white/10 text-white hover:bg-white/15"
            icon={<Plus size={16} />}
          >
            Nueva solicitud
          </Button>
        </div>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <LifeBuoy size={16} className="text-slate-400" />
            <span>Mis solicitudes</span>
          </div>
          <div className="w-full md:max-w-sm">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por título..."
              className="w-full"
              icon={<Search size={16} />}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Cargando solicitudes...
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          <p className="font-semibold">No se pudo cargar soporte</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : null}

      {!loading && !error && filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <EmptyState text="Aún no tienes solicitudes de soporte." />
          <p className="mt-3 text-center text-xs text-slate-500">
            Crea una solicitud para reportar un bug, pedir ayuda o escalar una emergencia.
          </p>
        </div>
      ) : (
        !loading && !error ? <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((req) => (
            <article key={req.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-500">
                    {typeLabel(req.type)} · Prioridad {priorityLabel(req.priority)}
                  </p>
                  <h2 className="mt-1 truncate text-lg font-semibold text-slate-900">{req.title}</h2>
                  <p className="mt-2 text-xs text-slate-500">Creada: {formatDate(req.createdAt)}</p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
                    req.status
                  )}`}
                >
                  {statusLabel(req.status)}
                </span>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  type="button"
                  onClick={() => navigate(`/admin/support/${req.id}`)}
                  className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                >
                  Abrir
                </Button>
              </div>
            </article>
          ))}
        </div> : null
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nueva solicitud de soporte"
        subtitle="Describe el problema o la ayuda que necesitas. El SuperAdmin te responderá aquí."
        size="lg"
        containerClassName="overflow-hidden border border-slate-200 bg-white"
        headerClassName="border-b border-slate-100 bg-white/80 px-6 py-5 backdrop-blur"
        bodyClassName="px-6 py-6"
      >
        <div className="space-y-4">
          <Field label="Título">
            <input
              value={createTitle}
              onChange={(event) => setCreateTitle(event.target.value)}
              placeholder="Ej: Error al guardar ticket"
              className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
            />
          </Field>

          <Field label="Descripción">
            <textarea
              value={createDescription}
              onChange={(event) => setCreateDescription(event.target.value)}
              rows={6}
              placeholder="Incluye pasos, pantallas afectadas y qué esperabas que ocurriera."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            />
          </Field>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => setCreateOpen(false)}
              disabled={createSubmitting}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleCreate()}
              disabled={createSubmitting || !createTitle.trim() || !createDescription.trim()}
              className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
            >
              {createSubmitting ? "Creando..." : "Enviar solicitud"}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
