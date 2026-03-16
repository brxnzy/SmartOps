import { MapPin } from "lucide-react";
import EmptyState from "../../../../components/EmptyState";
import { formatDate } from "../../../../utils/utils";
import type { InstallationsSectionProps } from "../../../../types/customerProfile360.types";


export default function InstallationsSection({ installations }: InstallationsSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <MapPin size={16} />
        Instalaciones
      </h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {installations.length === 0 ? (
          <EmptyState text="No hay instalaciones registradas." />
        ) : (
          installations.map((installation) => (
            <article key={installation.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">{installation.name}</p>
              <p className="mt-1 text-sm text-slate-700">
                Sitio: {installation.siteName ?? "No asociado"}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                Trabajo: {installation.workDescription ?? "Sin descripcion"}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Estado: {installation.status} | Alta: {formatDate(installation.createdAt)}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
