import { ArrowLeft, Layers, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import { getCompanyEntitlements } from "../../services/billing.service";
import { getSuperadminCompanyDetail } from "../../services/superadmin.service";
import type { CompanyEntitlements } from "../../types/billing.types";
import type { SuperadminCompanySummary } from "../../types/superadmin";
import { formatDate, initialsFromName } from "../../utils/utils";

export default function SuperAdminCompanyDetail() {
  const navigate = useNavigate();
  const { companyId } = useParams<{ companyId: string }>();
  const [company, setCompany] = useState<SuperadminCompanySummary | null>(null);
  const [entitlements, setEntitlements] = useState<CompanyEntitlements | null>(null);
  const [entitlementsLoading, setEntitlementsLoading] = useState(false);
  const [entitlementsError, setEntitlementsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCompany = async () => {
      if (!companyId) {
        setError("No se recibio la compania a consultar.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setEntitlementsError(null);
      setEntitlementsLoading(true);

      try {
        const [companyResult, planResult] = await Promise.allSettled([
          getSuperadminCompanyDetail(companyId),
          getCompanyEntitlements(companyId),
        ]);

        if (companyResult.status === "fulfilled") {
          setCompany(companyResult.value);
        } else {
          setError(
            companyResult.reason instanceof Error
              ? companyResult.reason.message
              : "No se pudo cargar la compania."
          );
        }

        if (planResult.status === "fulfilled") {
          setEntitlements(planResult.value);
        } else {
          setEntitlementsError(
            planResult.reason instanceof Error
              ? planResult.reason.message
              : "No se pudo cargar el plan de la compania."
          );
        }
      } finally {
        setEntitlementsLoading(false);
        setLoading(false);
      }
    };

    void loadCompany();
  }, [companyId]);

  return (
    <section className="space-y-6">
      <div className="flex items-center">
        <Button
          type="button"
          onClick={() => navigate("/superadmin/dashboard")}
          className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
        >
          <ArrowLeft size={16} />
          Volver al resumen
        </Button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Cargando detalle de compania...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          <p className="font-semibold">No se pudo cargar la compania</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : null}

      {!loading && !error && company ? (
        <>
          <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-linear-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-sm">
            <div className="absolute -right-20 -top-16 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt={`Logo ${company.name}`}
                    className="h-20 w-20 rounded-3xl border border-white/20 bg-white object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/15 bg-white/10 text-xl font-semibold text-white">
                    {initialsFromName(company.name)}
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
                    Compania
                  </p>
                  <h1 className="text-3xl font-semibold">{company.name}</h1>
                  <p className="text-sm text-slate-200/90">
                    Creada: {formatDate(company.createdAt)}
                  </p>
                </div>
              </div>

              <article className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-200">Usuarios</p>
                  <Users size={16} className="text-cyan-200" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-white">{company.totalUsers}</p>
              </article>

              <article className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-200">Plan</p>
                  <Layers size={16} className="text-cyan-200" />
                </div>
                <p className="mt-2 text-lg font-semibold text-white">
                  {entitlementsLoading ? "Cargando..." : entitlements?.planName ?? "Sin plan activo"}
                </p>
                <p className="mt-1 text-xs text-slate-200/80">
                  {entitlements?.planKey ? `Clave: ${entitlements.planKey}` : "No hay suscripcion activa registrada."}
                </p>
              </article>
            </div>
          </header>

          {entitlementsError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
              <p className="font-semibold">No se pudo cargar el plan</p>
              <p className="mt-1">{entitlementsError}</p>
            </div>
          ) : null}

          {entitlements && !entitlementsError ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Plan de la compania</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Informacion de solo lectura del plan activo.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Activo</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{entitlements.planName}</p>
                  <p className="text-xs text-slate-500">Clave: {entitlements.planKey}</p>
                </div>
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Usuarios de la compania</h2>
              <p className="text-sm text-slate-500">
                Listado de solo lectura con nombre, cedula y correo.
              </p>
            </div>

            {company.users.length === 0 ? (
              <EmptyState text="Esta compania no tiene usuarios registrados todavia." />
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {company.users.map((user) => (
                  <article
                    key={user.id}
                    className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    {user.photoUrl ? (
                      <img
                        src={user.photoUrl}
                        alt={user.name}
                        className="h-14 w-14 rounded-full border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">
                        {initialsFromName(user.name)}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-900">
                        {user.name}
                      </p>
                      <p className="truncate text-sm text-slate-500">
                        Cedula: {user.idCard ?? "Sin cedula"}
                      </p>
                      <p className="truncate text-sm text-slate-500">
                        {user.email ?? "Sin email"}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}
