import { useEffect, useState, type KeyboardEvent } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import Button from "../../../../components/Button";
import type { CustomerSiteZone } from "../../../../types/customerProfile360.types";
import type { SiteZonesPanelProps } from "../../../../types/interfaces";

export default function SiteZonesPanel({
  zones,
  loading,
  error,
  onUpdate,
  onDelete,
  onAddZone,
}: SiteZonesPanelProps) {
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const isBusy = workingId !== null || loading;

  useEffect(() => {
    if (!editingZoneId) return;
    if (!zones.some((zone) => zone.id === editingZoneId)) {
      setEditingZoneId(null);
      setEditingName("");
    }
  }, [editingZoneId, zones]);

  const handleAddKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    onAddZone?.();
  };

  const handleStartEdit = (zone: CustomerSiteZone) => {
    setEditingZoneId(zone.id);
    setEditingName(zone.name);
    setConfirmDeleteId(null);
  };

  const handleCancelEdit = () => {
    setEditingZoneId(null);
    setEditingName("");
  };

  const handleSaveEdit = async () => {
    if (!editingZoneId) return;
    const trimmed = editingName.trim();
    if (!trimmed) return;

    setWorkingId(editingZoneId);
    try {
      await onUpdate(editingZoneId, trimmed);
      setEditingZoneId(null);
      setEditingName("");
    } catch {
      // Parent handles notifications.
    } finally {
      setWorkingId(null);
    }
  };

  const handleEditKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void handleSaveEdit();
  };

  const handleConfirmDelete = (zoneId: string) => {
    setConfirmDeleteId(zoneId);
    if (editingZoneId === zoneId) {
      setEditingZoneId(null);
      setEditingName("");
    }
  };

  const handleCancelDelete = () => {
    setConfirmDeleteId(null);
  };

  const handleDelete = async (zoneId: string) => {
    setWorkingId(zoneId);
    try {
      await onDelete(zoneId);
      setConfirmDeleteId(null);
    } catch {
      // Parent handles notifications.
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Zonas del sitio
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Gestiona los espacios como sala, cocina o habitacion.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">{zones.length} zonas</span>
          {onAddZone ? (
            <Button
              type="button"
              onClick={onAddZone}
              onKeyDown={handleAddKey}
              disabled={isBusy}
              className="h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-none transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Plus size={12} />
              Agregar zona
            </Button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Cargando zonas...
        </div>
      ) : error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : zones.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No hay zonas registradas para este sitio.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {zones.map((zone, index) => {
            const isEditing = zone.id === editingZoneId;
            const isConfirmingDelete = zone.id === confirmDeleteId;
            const isRowBusy = workingId === zone.id;

            return (
              <div
                key={zone.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between"
              >
                {isEditing ? (
                  <input
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    onKeyDown={handleEditKey}
                    disabled={isBusy}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15 disabled:bg-slate-50"
                  />
                ) : (
                  <div className="flex items-center gap-3 text-sm font-semibold text-slate-800">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                      {index + 1}
                    </span>
                    <span>{zone.name}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {isEditing ? (
                    <>
                      <Button
                        type="button"
                        onClick={() => void handleSaveEdit()}
                        disabled={isBusy || !editingName.trim() || isRowBusy}
                        className="rounded-lg border border-blue-600 bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-none transition hover:bg-blue-800"
                      >
                        <Check size={14} />
                        Guardar
                      </Button>
                      <Button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={isBusy || isRowBusy}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-none transition hover:bg-slate-100"
                      >
                        <X size={14} />
                        Cancelar
                      </Button>
                    </>
                  ) : isConfirmingDelete ? (
                    <>
                      <Button
                        type="button"
                        onClick={() => void handleDelete(zone.id)}
                        disabled={isBusy || isRowBusy}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 shadow-none transition hover:bg-red-100"
                      >
                        <Trash2 size={14} />
                        Confirmar
                      </Button>
                      <Button
                        type="button"
                        onClick={handleCancelDelete}
                        disabled={isBusy || isRowBusy}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-none transition hover:bg-slate-100"
                      >
                        <X size={14} />
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        onClick={() => handleStartEdit(zone)}
                        disabled={isBusy}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-none transition hover:bg-slate-100"
                      >
                        <Pencil size={14} />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleConfirmDelete(zone.id)}
                        disabled={isBusy}
                        className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 shadow-none transition hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                        Eliminar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
