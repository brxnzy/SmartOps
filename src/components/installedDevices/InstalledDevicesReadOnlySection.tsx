import type { InstalledDeviceListItem } from "../../types/installedDevice.types";

function formatDateTime(value: string | null): string {
  if (!value) return "Sin fecha";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sin fecha";
  return parsed.toLocaleString("es-DO");
}

export default function InstalledDevicesReadOnlySection(props: {
  loading: boolean;
  error: string | null;
  devices: InstalledDeviceListItem[];
}) {
  const { loading, error, devices } = props;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Dispositivos instalados</h2>
          <p className="mt-1 text-sm text-slate-600">
            Registro real. Se usa para acta, garantías y soporte.
          </p>
        </div>
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          {devices.length} registros
        </span>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 shadow-inner">
        <table className="min-w-[1000px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Dispositivo</th>
              <th className="px-3 py-2">Zona</th>
              <th className="px-3 py-2">Técnico</th>
              <th className="px-3 py-2">Serial/MAC</th>
              <th className="px-3 py-2">Firmware</th>
              <th className="px-3 py-2">Ubicación</th>
              <th className="px-3 py-2">Instalado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {!loading && devices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">
                  No hay dispositivos instalados registrados.
                </td>
              </tr>
            ) : (
              devices.map((device) => (
                <tr key={device.id} className="text-slate-700">
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-900">{device.deviceName}</p>
                    <p className="text-xs text-slate-500">{[device.deviceBrand, device.deviceModel].filter(Boolean).join(" ")}</p>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-700">{device.zoneName ?? "-"}</td>
                  <td className="px-3 py-2 text-xs text-slate-700">{device.installedByName ?? "-"}</td>
                  <td className="px-3 py-2">
                    <p className="text-xs text-slate-700">S: {device.serial ?? "-"}</p>
                    <p className="text-xs text-slate-700">M: {device.mac ?? "-"}</p>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-700">{device.firmware ?? "-"}</td>
                  <td className="px-3 py-2 text-xs text-slate-700">{device.locationDetail ?? "-"}</td>
                  <td className="px-3 py-2 text-xs text-slate-700">{formatDateTime(device.installedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

