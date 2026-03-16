import { HardDrive } from "lucide-react";
import EmptyState from "../../../../components/EmptyState";
import { formatDate } from "../../../../utils/utils";
import type { DevicesSectionProps } from "../../../../types/customerProfile360.types";


export default function DevicesSection({ devices }: DevicesSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <HardDrive size={16} />
        Dispositivos instalados
      </h2>
      <div className="mt-4 space-y-2">
        {devices.length === 0 ? (
          <EmptyState text="No hay dispositivos instalados." />
        ) : (
          devices.map((device) => (
            <div key={device.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">{device.name}</p>
                <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700">
                  {device.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Serial: {device.serial ?? "N/A"} | Sitio: {device.installationName ?? "N/A"} | Alta:{" "}
                {formatDate(device.createdAt)}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
