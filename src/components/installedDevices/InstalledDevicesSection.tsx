import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import Button from "../Button";
import type { InstalledDeviceListItem, InstalledDeviceStatus, UpdateInstalledDeviceInput } from "../../types/installedDevice.types";
import InstalledDeviceModal from "./InstalledDeviceModal";

type CatalogDeviceOption = {
  id: string;
  label: string;
};

type ZoneOption = {
  id: string;
  name: string;
};

type TechnicianOption = {
  id: string;
  name: string;
};

type InstalledDevicesSectionProps = {
  siteId: string;
  zones: ZoneOption[];
  catalogDevices: CatalogDeviceOption[];
  technicians: TechnicianOption[];
  defaultInstalledBy: string | null;
  canManage: boolean;
  loading: boolean;
  error: string | null;
  devices: InstalledDeviceListItem[];
  creating: boolean;
  savingId: string | null;
  deletingId: string | null;
  onReload: () => void;
  onCreate: (input: {
    siteId: string;
    zoneId: string;
    catalogDeviceId: string;
    serial: string | null;
    mac: string | null;
    firmware: string | null;
    locationDetail: string | null;
    installedAt: string | null;
    installedBy: string | null;
    status: InstalledDeviceStatus;
  }) => Promise<boolean>;
  onUpdate: (deviceId: string, patch: Partial<UpdateInstalledDeviceInput>) => Promise<boolean>;
  onChangeStatus: (deviceId: string, status: InstalledDeviceStatus) => Promise<boolean>;
  onRemove: (deviceId: string) => Promise<boolean>;
};

function formatDateTime(value: string | null): string {
  if (!value) return "Sin fecha";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sin fecha";
  return parsed.toLocaleString("es-DO");
}

function statusBadge(status: InstalledDeviceStatus): string {
  if (status === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "maintenance") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function InstalledDevicesSection(props: InstalledDevicesSectionProps) {
  const {
    siteId,
    zones,
    catalogDevices,
    technicians,
    defaultInstalledBy,
    canManage,
    loading,
    error,
    devices,
    creating,
    savingId,
    deletingId,
    onReload,
    onCreate,
    onUpdate,
    onChangeStatus,
    onRemove,
  } = props;

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedDevice, setSelectedDevice] = useState<InstalledDeviceListItem | null>(null);

  const beginCreate = () => {
    setSelectedDevice(null);
    setModalMode("create");
    setModalOpen(true);
  };

  const beginEdit = (device: InstalledDeviceListItem) => {
    setSelectedDevice(device);
    setModalMode("edit");
    setModalOpen(true);
  };

  const installedCount = devices.length;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Dispositivos instalados</h2>
          <p className="mt-1 text-sm text-slate-600">
            Registro real (ejecución). Estos datos se usan para acta, garantías y soporte.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            {installedCount} registros
          </span>
          <Button
            type="button"
            onClick={() => onReload()}
            disabled={loading}
            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
          >
            Actualizar
          </Button>
          <Button
            type="button"
            onClick={() => beginCreate()}
            disabled={!canManage}
            className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Registrar
          </Button>
        </div>
      </div>

      <InstalledDeviceModal
        open={modalOpen}
        mode={modalMode}
        busy={creating || (modalMode === "edit" && Boolean(selectedDevice?.id) && savingId === selectedDevice?.id)}
        siteId={siteId}
        zones={zones}
        catalogDevices={catalogDevices}
        technicians={technicians}
        defaultInstalledBy={defaultInstalledBy}
        device={selectedDevice}
        onClose={() => setModalOpen(false)}
        onCreate={onCreate}
        onUpdate={onUpdate}
      />

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 shadow-inner">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Dispositivo</th>
              <th className="px-3 py-2">Zona</th>
              <th className="px-3 py-2">Técnico</th>
              <th className="px-3 py-2">Serial/MAC</th>
              <th className="px-3 py-2">Firmware</th>
              <th className="px-3 py-2">Ubicación</th>
              <th className="px-3 py-2">Instalado</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {!loading && devices.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-sm text-slate-500">
                  No hay dispositivos instalados registrados.
                </td>
              </tr>
            ) : (
              devices.map((device) => {
                const isSaving = savingId === device.id;
                const isDeleting = deletingId === device.id;
                return (
                  <tr key={device.id} className="text-slate-700">
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-900">{device.deviceName}</p>
                      <p className="text-xs text-slate-500">{[device.deviceBrand, device.deviceModel].filter(Boolean).join(" ")}</p>
                    </td>
                    <td className="px-3 py-2">{device.zoneName ?? "-"}</td>
                    <td className="px-3 py-2 text-xs text-slate-700">{device.installedByName ?? "-"}</td>
                    <td className="px-3 py-2">
                      <p className="text-xs text-slate-700">S: {device.serial ?? "-"}</p>
                      <p className="text-xs text-slate-700">M: {device.mac ?? "-"}</p>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700">{device.firmware ?? "-"}</td>
                    <td className="px-3 py-2 text-xs text-slate-700">{device.locationDetail ?? "-"}</td>
                    <td className="px-3 py-2 text-xs text-slate-700">{formatDateTime(device.installedAt)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadge(device.status)}`}>
                        {device.status === "active" ? "activo" : device.status === "maintenance" ? "mantenimiento" : "retirado"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-2">
                        {canManage ? (
                          <select
                            value={device.status}
                            onChange={(event) => void onChangeStatus(device.id, event.target.value as InstalledDeviceStatus)}
                            disabled={isSaving || isDeleting}
                            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                            aria-label="Cambiar estado"
                          >
                            <option value="active">Activo</option>
                            <option value="maintenance">Mantenimiento</option>
                            <option value="retired">Retirado</option>
                          </select>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => beginEdit(device)}
                          disabled={!canManage || isSaving || isDeleting}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-2 py-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!canManage) return;
                            if (!window.confirm("¿Eliminar este dispositivo instalado? (Soft delete)")) return;
                            void onRemove(device.id);
                          }}
                          disabled={!canManage || isSaving || isDeleting}
                          className="inline-flex items-center justify-center rounded-lg border border-rose-300 bg-white px-2 py-2 text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}
