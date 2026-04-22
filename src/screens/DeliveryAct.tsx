import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { ArrowLeft, CheckCircle, ExternalLink, FileText, PenLine } from "lucide-react";
import useDeliveryAct from "../hooks/useDeliveryAct";
import useAuth from "../hooks/useAuth";
import SignaturePad from "../components/SignaturePad";
import Button from "../components/Button";

function formatDateTime(value: string | null): string {
  if (!value) return "Sin fecha";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sin fecha";
  return parsed.toLocaleString("es-DO");
}

function statusBadge(status: string) {
  if (status === "signed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "accepted") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function statusDot(status: string) {
  if (status === "signed") return "bg-emerald-500";
  if (status === "accepted") return "bg-blue-500";
  return "bg-amber-500";
}

function statusLabel(status: string) {
  if (status === "signed") return "Firmada";
  if (status === "accepted") return "Aceptada";
  return "Pendiente";
}

type DeliveryActViewProps = {
  actId?: string | null;
  embedded?: boolean;
};

export function DeliveryActView({ actId: actIdProp, embedded = false }: DeliveryActViewProps) {
  const { actId } = useParams<{ actId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { roleProfile } = useAuth();
  const resolvedActId = actIdProp ?? actId ?? null;
  const returnTo = searchParams.get("returnTo");
  const isAdminView = location.pathname.startsWith("/admin/");
  const isCustomer = roleProfile?.name?.trim().toLowerCase() === "customer";
  const canSign = isCustomer && !isAdminView;
  const showBackButton = Boolean(returnTo) && !embedded;
  const { act, loading, error, signing, acceptAct, signAct } = useDeliveryAct(resolvedActId);
  const [showSignature, setShowSignature] = useState(false);

  const deviceRows = useMemo(() => act?.devices ?? [], [act?.devices]);

  if (loading) {
    return (
      <section className={embedded ? "space-y-6" : "min-h-screen bg-slate-100 p-6 md:p-10"}>
        <div className={embedded ? "space-y-6" : "mx-auto max-w-6xl space-y-6"}>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Cargando acta...
          </div>
        </div>
      </section>
    );
  }

  if (error || !act) {
    return (
      <section className={embedded ? "space-y-6" : "min-h-screen bg-slate-100 p-6 md:p-10"}>
        <div className={embedded ? "space-y-6" : "mx-auto max-w-6xl space-y-6"}>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
            {error ?? "No se pudo cargar el acta."}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={embedded ? "space-y-6" : "min-h-screen bg-slate-100 p-6 md:p-10"}>
      <div className={embedded ? "space-y-6" : "mx-auto max-w-6xl space-y-6"}>
        <header className="rounded-3xl border border-slate-200 bg-linear-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Acta de entrega</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">Acta #{act.id.slice(0, 8)}</h1>
              <p className="mt-1 text-sm text-slate-300">Documento oficial de entrega y aceptación de la instalación.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {showBackButton ? (
                <Button
                  type="button"
                  onClick={() => {
                    if (returnTo) {
                      navigate(returnTo);
                    } else {
                      navigate(-1);
                    }
                  }}
                  className="border-white/30 bg-white text-slate-900 hover:bg-slate-100"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Regresar
                </Button>
              ) : null}

              <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold ${statusBadge(act.status)}`}>
                <span className={`h-2 w-2 rounded-full ${statusDot(act.status)}`} />
                {statusLabel(act.status)}
              </span>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="inline-flex items-center gap-2 text-base font-semibold text-slate-900">
                <FileText className="h-4 w-4" />
                Documento PDF
              </h2>
              {act.pdfUrl ? (
                <a
                  href={act.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir en nueva pestaña
                </a>
              ) : null}
            </div>

            <div className="mt-4">
              {act.pdfUrl ? (
                <iframe
                  title="Acta de entrega (PDF)"
                  src={act.pdfUrl}
                  className="h-[68vh] min-h-[520px] w-full rounded-xl border border-slate-200 bg-white shadow-inner"
                />
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 shadow-inner">
                  El PDF aún no está disponible.
                </div>
              )}
            </div>
          </article>

          <aside className="space-y-4">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Resumen</h2>
              <dl className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</dt>
                  <dd className="mt-1 font-medium text-slate-900">{act.customerName ?? "No definido"}</dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sitio</dt>
                  <dd className="mt-1 font-medium text-slate-900">{act.siteName ?? "No definido"}</dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Técnico</dt>
                  <dd className="mt-1 font-medium text-slate-900">{act.technicianName ?? "No definido"}</dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Entregado</dt>
                  <dd className="mt-1 font-medium text-slate-900">{formatDateTime(act.deliveredAt)}</dd>
                </div>
              </dl>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900">Acciones</h2>
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge(act.status)}`}>
                  <span className={`h-2 w-2 rounded-full ${statusDot(act.status)}`} />
                  {statusLabel(act.status)}
                </span>
              </div>

              {!canSign ? (
                <p className="mt-3 text-sm text-slate-600">
                  Vista de solo lectura. Solo el cliente puede aceptar o firmar el acta.
                </p>
              ) : act.status !== "pending" ? (
                <p className="mt-3 text-sm text-emerald-700">Acta finalizada correctamente.</p>
              ) : (
                <>
                  <p className="mt-3 text-sm text-slate-600">
                    Puedes firmar digitalmente o aceptar sin firma. Al completar el acta, el proyecto se finaliza automáticamente.
                  </p>

                  <div className="mt-4 space-y-3">
                    <Button
                      type="button"
                      onClick={() => setShowSignature(true)}
                      disabled={signing}
                      className="w-full border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <PenLine className="h-4 w-4" />
                      Firmar digitalmente
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void acceptAct()}
                      disabled={signing}
                      className="w-full border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Aceptar sin firma
                    </Button>
                  </div>

                  {showSignature ? (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Firma</p>
                        <button
                          type="button"
                          onClick={() => setShowSignature(false)}
                          disabled={signing}
                          className="text-xs font-semibold text-slate-600 hover:text-slate-800 disabled:opacity-60"
                        >
                          Ocultar
                        </button>
                      </div>
                      <div className="mt-3">
                        <SignaturePad disabled={signing} onConfirm={(dataUrl) => void signAct(dataUrl)} />
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Garantía y condiciones</h2>
              <p className="mt-3 text-sm text-slate-600">{act.warrantyTerms ?? "No hay condiciones registradas."}</p>
            </article>
          </aside>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Dispositivos instalados</h2>
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 shadow-inner">
              <table className="min-w-[720px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Dispositivo</th>
                    <th className="px-3 py-2">Zona</th>
                    <th className="px-3 py-2">Serial/MAC</th>
                    <th className="px-3 py-2 text-right">Cant.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {deviceRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500">
                        No hay dispositivos registrados.
                      </td>
                    </tr>
                  ) : (
                    deviceRows.map((device, index) => (
                      <tr key={`${device.deviceId ?? "device"}-${index}`} className="text-slate-700">
                        <td className="px-3 py-2">
                          <p className="font-medium text-slate-900">{device.name}</p>
                          <p className="text-xs text-slate-500">
                            {[device.brand, device.model].filter(Boolean).join(" ")}
                          </p>
                        </td>
                        <td className="px-3 py-2">{device.zoneName ?? "-"}</td>
                        <td className="px-3 py-2">{device.serial ?? device.mac ?? "-"}</td>
                        <td className="px-3 py-2 text-right">{device.quantity ?? 1}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Credenciales entregadas</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              {act.credentials.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                  No se registraron credenciales.
                </div>
              ) : (
                act.credentials.map((cred, index) => (
                  <div key={`${cred.label}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{cred.label}</p>
                    {cred.username ? <p className="mt-1 font-medium text-slate-900">Usuario: {cred.username}</p> : null}
                    {cred.notes ? <p className="mt-1 text-xs text-slate-500">{cred.notes}</p> : null}
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      </div>
    </section>
  );
}

export default function DeliveryActPage() {
  return <DeliveryActView />;
}

