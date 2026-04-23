import EmptyState from "../../../../components/EmptyState";
import type { CustomerInstalledDeviceSummary } from "../../../../types/customerProfile360.types";

interface DevicesSectionProps {
  devices: CustomerInstalledDeviceSummary[];
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("es-DO");
}

export default function DevicesSection({ devices }: DevicesSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Dispositivos instalados</h2>
      {devices.length === 0 ? (
        <div className="mt-4">
          <EmptyState text="No hay dispositivos instalados registrados para este cliente." />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2">Dispositivo</th>
                <th className="px-3 py-2">Marca</th>
                <th className="px-3 py-2">Modelo</th>
                <th className="px-3 py-2">Sitio</th>
                <th className="px-3 py-2">Zona</th>
                <th className="px-3 py-2">Serial / MAC</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Instalado</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.installedDeviceId} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-3 py-3">{device.deviceName ?? "Dispositivo"}</td>
                  <td className="px-3 py-3">{device.deviceBrand ?? "-"}</td>
                  <td className="px-3 py-3">{device.deviceModel ?? "-"}</td>
                  <td className="px-3 py-3">{device.siteName ?? "-"}</td>
                  <td className="px-3 py-3">{device.zoneName ?? "-"}</td>
                  <td className="px-3 py-3">
                    {device.serial || device.mac ? (
                      <div className="space-y-1">
                        {device.serial ? <div>Serial: {device.serial}</div> : null}
                        {device.mac ? <div>MAC: {device.mac}</div> : null}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-800">{device.status}</td>
                  <td className="px-3 py-3">{formatDateTime(device.installedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
