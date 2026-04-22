import type { SurveyDeviceLayout, SurveyZoneLayout } from "../../types/siteSurveyExecution.types";

type CatalogDeviceOption = {
  id: string;
  label: string;
};

export default function InstalledDevicesFromPlanSection(props: {
  zones: Array<Pick<SurveyZoneLayout, "id" | "name">>;
  devices: SurveyDeviceLayout[];
  catalogDevices: CatalogDeviceOption[];
  selectedZoneId: string;
  onZoneChange: (zoneId: string) => void;
  syncing: boolean;
  onSyncZone: () => void;
}) {
  const { zones, devices, catalogDevices, selectedZoneId, onZoneChange, syncing, onSyncZone } = props;

  const catalogLabelById = new Map(catalogDevices.map((device) => [device.id, device.label]));
  const selectedZone = zones.find((zone) => zone.id === selectedZoneId) ?? null;
  const rows = devices.filter((device) => device.zoneId === selectedZoneId);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Dispositivos por zona (plano)</h2>
          <p className="mt-1 text-sm text-slate-600">
            Vista desde el plano: muestra los dispositivos colocados en la zona seleccionada.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedZoneId}
            onChange={(event) => onZoneChange(event.target.value)}
            className="rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onSyncZone}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncing ? "Cargando..." : "Cargar como instalados"}
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 shadow-inner">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Dispositivo</th>
              <th className="px-3 py-2">Etiqueta</th>
              <th className="px-3 py-2">Zona</th>
              <th className="px-3 py-2">Posición</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500">
                  No hay dispositivos colocados en {selectedZone?.name ?? "esta zona"}.
                </td>
              </tr>
            ) : (
              rows.map((device) => (
                <tr key={device.id} className="text-slate-700">
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-900">{catalogLabelById.get(device.deviceId) ?? device.label ?? "Dispositivo"}</p>
                    <p className="text-xs text-slate-500">Catálogo: {device.deviceId}</p>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-700">{device.label ?? "-"}</td>
                  <td className="px-3 py-2 text-xs text-slate-700">{selectedZone?.name ?? "-"}</td>
                  <td className="px-3 py-2 text-xs text-slate-700">
                    x: {Math.round(device.x)} · y: {Math.round(device.y)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}
