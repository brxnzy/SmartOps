import { useMemo } from "react";
import { RefreshCcw, Search, UserRound } from "lucide-react";
import Button from "../../../components/Button";
import Input from "../../../components/Input";
import useSettingsLogs from "../../../hooks/useSettingsLogs";



export default function SettingsLogs() {
  const {
    filteredLogs,
    entities,
    actions,
    loading,
    error,
    searchTerm,
    actionFilter,
    entityFilter,
    setSearchTerm,
    setEntityFilter,
    formatTime,
    getAffectedLabel,
    formatActionLabel,
    formatDate,
    setActionFilter,
    reload,
  } = useSettingsLogs();
  const totalLabel = useMemo(() => {
    if (loading) return "Cargando...";
    return `${filteredLogs.length} registros`;
  }, [filteredLogs.length, loading]);

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Logs</h1>
          <p className="text-sm text-slate-500">Bitacora de acciones - {totalLabel}</p>
        </div>
        <Button
          type="button"
          onClick={() => void reload()}
          className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
        >
          <RefreshCcw size={14} />
          Refrescar
        </Button>
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-220px">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por accion, entidad, usuario o ID..."
            icon={<Search size={16} />}
          />
        </div>
        <select
          value={entityFilter}
          onChange={(event) => setEntityFilter(event.target.value)}
          className="min-w-180px rounded-lg border-2 border-gray-400 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">Todas las entidades</option>
          {entities.map((entity) => (
            <option key={entity} value={entity}>
              {entity}
            </option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value)}
          className="min-w-180px rounded-lg border-2 border-gray-400 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">Todas las acciones</option>
          {actions.map((action) => (
            <option key={action} value={action}>
              {formatActionLabel(action)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
            Cargando bitacora...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
            No hay registros para los filtros seleccionados.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const userName = log.user?.name ?? "Sistema";
            const avatarUrl = log.user?.photo_url ?? null;
            const affectedLabel = getAffectedLabel(log);
            return (
              <article
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)] transition hover:border-blue-200 hover:bg-slate-50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex flex-col items-start text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">{formatTime(log.created_at)}</span>
                    <span className="text-[10px] text-slate-400">{formatDate(log.created_at)}</span>
                  </div>
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={userName}
                      className="h-9 w-9 rounded-full border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-500">
                      <UserRound size={16} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{userName}</p>
                    <p className="truncate text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{formatActionLabel(log.action)}</span>
                      <span className="text-slate-400"> - </span>
                      <span className="text-slate-600">{affectedLabel}</span>
                    </p>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
