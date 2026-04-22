import landingImg from "../assets/landing.svg";
import logoImg from "../assets/logo.png";
import { Link } from "react-router-dom";
import { BarChart3, CalendarCheck, Check, CircleUserRound, ShieldCheck, Sparkles, X } from "lucide-react";
import useAuth from "../hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import { listActivePricingPlans } from "../services/pricing.service";
import type { PricingPlan } from "../types/billing.types";
import useCompanyEntitlements from "../hooks/useCompanyEntitlements";

const Landing: React.FC = () => {
  const { authUser, userProfile } = useAuth();
  const { entitlements } = useCompanyEntitlements();

  const isAuthenticated = Boolean(authUser);
  const userDisplayName = userProfile?.name ?? "Dashboard";

  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [plansError, setPlansError] = useState<string | null>(null);

  const fallbackPlans = useMemo<PricingPlan[]>(
    () => [
      {
        id: "basic",
        key: "basic",
        name: "Básico",
        description: "Para empezar y organizar operaciones.",
        price: 0,
        billingCycle: "monthly",
        isActive: true,
        sortOrder: 1,
        limits: {
          maxClients: 10,
          maxSites: 5,
          maxDevices: 50,
          maxTechnicians: 2,
          maxTicketsPerMonth: 100,
          allowSimulator: true,
          allowAdvancedAutomations: false,
        },
      },
      {
        id: "pro",
        key: "pro",
        name: "Pro",
        description: "Para equipos en crecimiento con más automatización.",
        price: 49,
        billingCycle: "monthly",
        isActive: true,
        sortOrder: 2,
        limits: {
          maxClients: 200,
          maxSites: 100,
          maxDevices: 1000,
          maxTechnicians: 10,
          maxTicketsPerMonth: 1000,
          allowSimulator: true,
          allowAdvancedAutomations: true,
        },
      },
      {
        id: "enterprise",
        key: "enterprise",
        name: "Enterprise",
        description: "Para operaciones avanzadas y soporte dedicado.",
        price: 199,
        billingCycle: "monthly",
        isActive: true,
        sortOrder: 3,
        limits: {
          maxClients: null,
          maxSites: null,
          maxDevices: null,
          maxTechnicians: null,
          maxTicketsPerMonth: null,
          allowSimulator: true,
          allowAdvancedAutomations: true,
        },
      },
    ],
    []
  );

  useEffect(() => {
    let active = true;

    listActivePricingPlans()
      .then((data) => {
        if (!active) return;
        setPlans(data);
        setPlansError(null);
      })
      .catch((error) => {
        console.error("[Landing] pricing_plans_error", error);
        if (!active) return;
        setPlans([]);
        setPlansError(error instanceof Error ? error.message : "No se pudieron cargar los planes.");
      });

    return () => {
      active = false;
    };
  }, []);

  const visiblePlans = useMemo(() => {
    if (plans.length === 0) return fallbackPlans;

    const byKey = new Map<string, PricingPlan>();
    for (const plan of plans) byKey.set(plan.key, plan);
    for (const plan of fallbackPlans) {
      if (!byKey.has(plan.key)) byKey.set(plan.key, plan);
    }

    return Array.from(byKey.values())
      .filter((plan) => plan.isActive)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [plans, fallbackPlans]);

  const formatLimit = (value: number | null | undefined) => (value === null || value === undefined ? "Ilimitado" : value);
  const formatPrice = (price: number | null, billingCycle: PricingPlan["billingCycle"]) => {
    if (!price || price <= 0) return "Gratis";
    const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(price);
    return `${currency}/${billingCycle === "annual" ? "año" : "mes"}`;
  };

  return (
    <header className="min-h-screen overflow-x-hidden bg-white">
      <nav className="bg-white/90 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-1">
            <img className="h-10 w-auto sm:h-12" src={logoImg} alt="Logo" />
            <h1 className="text-xl font-bold sm:text-2xl">
              <span>Smart</span>
              <span className="text-blue-500">Ops</span>
            </h1>
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              {entitlements?.planName && (
                <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 sm:inline-flex">
                  Plan: {entitlements.planName}
                </span>
              )}
              <Link to="/admin">
                <button className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-xs font-semibold tracking-wide text-white uppercase transition-colors duration-300 hover:bg-blue-600 focus:outline-none sm:px-5 sm:text-sm">
                  <CircleUserRound size={18} />
                  <span className="max-w-28 truncate normal-case sm:max-w-40">{userDisplayName}</span>
                </button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <button className="rounded-lg border border-blue-200 px-4 py-2 text-xs font-semibold  tracking-wide text-blue-700 transition-colors duration-300 hover:border-blue-300 hover:bg-blue-50 sm:px-5 sm:text-sm">
                  Login
                </button>
              </Link>
              <Link to="/register?plan=basic">
                <button className="rounded-lg bg-blue-500 px-4 py-2 text-xs font-semibold  tracking-wide text-white transition-colors duration-300 hover:bg-blue-600 sm:px-5 sm:text-sm">
                  Empezar gratis
                </button>
              </Link>
            </div>
          )}
        </div>
      </nav>

      <div className="relative">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-20 h-64 w-64 rounded-full bg-blue-100/60 blur-3xl" />
          <div className="absolute right-0 top-10 h-72 w-72 rounded-full bg-slate-100/70 blur-3xl" />
        </div>

        <div className="container relative mx-auto px-4 pb-10 pt-6 sm:px-6 sm:pb-14 sm:pt-10">
          <div className="flex w-full flex-col-reverse items-center gap-8 lg:flex-row lg:gap-10">
            <div className="w-full lg:w-1/2">
              <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                  <Sparkles size={14} />
                  Operaciones inteligentes
                </span>
                <h1 className="mt-4 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
                  Todo tu negocio de domotica{" "}
                  <span className="text-blue-500">bajo control</span>
                </h1>

                <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
                  Centraliza clientes, tickets, inventario y visitas tecnicas en una sola plataforma.
                  Automatiza tareas y mantente al dia con indicadores claros y un calendario operativo.
                </p>

                {isAuthenticated && (
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                    <Link to="/admin">
                      <button className="rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-300 hover:bg-blue-600">
                        Ir al dashboard
                      </button>
                    </Link>
                  </div>
                )}

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white/80 p-3 text-center">
                    <p className="text-lg font-semibold text-slate-900">+30%</p>
                    <p className="text-xs text-slate-500">menos tiempo en seguimiento</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white/80 p-3 text-center">
                    <p className="text-lg font-semibold text-slate-900">24/7</p>
                    <p className="text-xs text-slate-500">visibilidad del servicio</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white/80 p-3 text-center">
                    <p className="text-lg font-semibold text-slate-900">1 solo</p>
                    <p className="text-xs text-slate-500">panel para todo el equipo</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex w-full items-center justify-center lg:w-1/2">
              <img
                className="h-auto w-full max-w-md object-contain sm:max-w-lg lg:max-w-xl"
                src={landingImg}
                alt="Smart Home Illustration"
              />
            </div>
          </div>
        </div>
      </div>

      <section className="bg-slate-50">
        <div className="container mx-auto px-4 py-12 sm:px-6 lg:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
              <ShieldCheck size={14} />
              Planes y límites
            </span>
            <h2 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">Elige el plan ideal para tu operación</h2>
            <p className="mt-3 text-sm text-slate-600 sm:text-base">
              Empieza gratis y haz upgrade cuando tu equipo o tus instalaciones crezcan.
            </p>
            {plansError && (
              <p className="mt-4 text-xs text-slate-500">
                Mostrando planes por defecto (no se pudo cargar desde Supabase).
              </p>
            )}
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {visiblePlans.slice(0, 3).map((plan) => {
              const isBasic = plan.key === "basic";
              const isFeatured = plan.key === "pro";
              const isCurrentPlan = isAuthenticated && entitlements?.planKey === plan.key;
              const limits = plan.limits;
              return (
                <div
                  key={plan.key}
                  className={[
                    "group relative overflow-hidden rounded-2xl border bg-white p-6 shadow-sm transition",
                    isFeatured ? "border-blue-200 shadow-blue-100" : "border-slate-200",
                  ].join(" ")}
                >
                  {isFeatured && (
                    <div className="absolute right-4 top-4 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Más popular
                    </div>
                  )}


                  {isCurrentPlan && (
                    <div className="absolute left-4 top-4 rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">Plan actual</div>
                  )}

                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                      <p className="mt-1 text-sm text-slate-600">{plan.description ?? ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-slate-900">{formatPrice(plan.price, plan.billingCycle)}</p>
                      <p className="mt-1 text-xs text-slate-500">Facturación {plan.billingCycle === "annual" ? "anual" : "mensual"}</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Límites</p>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <div>
                        <dt className="text-xs text-slate-500">Usuarios</dt>
                        <dd className="font-semibold text-slate-900">{formatLimit(limits?.maxTechnicians)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Sitios</dt>
                        <dd className="font-semibold text-slate-900">{formatLimit(limits?.maxSites)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Dispositivos</dt>
                        <dd className="font-semibold text-slate-900">{formatLimit(limits?.maxDevices)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Tickets / mes</dt>
                        <dd className="font-semibold text-slate-900">{formatLimit(limits?.maxTicketsPerMonth)}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Funcionalidades</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-700">
                      <li className="flex items-center justify-between gap-3">
                        <span>Simulador</span>
                        {limits?.allowSimulator ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                            <Check size={14} /> Sí
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                            <X size={14} /> No
                          </span>
                        )}
                      </li>
                      <li className="flex items-center justify-between gap-3">
                        <span>Automatizaciones avanzadas</span>
                        {limits?.allowAdvancedAutomations ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                            <Check size={14} /> Sí
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                            <X size={14} /> No
                          </span>
                        )}
                      </li>
                    </ul>
                  </div>

                  <div className="mt-6">
                    <Link to={`/register?plan=${encodeURIComponent(plan.key)}`}>
                      <button
                        onClick={() => {
                          try {
                            localStorage.setItem("pending_plan_key", plan.key);
                          } catch {
                            // ignore
                          }
                        }}
                        className={[
                          "inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
                          isFeatured
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-slate-900 text-white hover:bg-slate-800",
                        ].join(" ")}
                      >
                        {isBasic ? "Empezar gratis" : "Elegir plan"}
                        <span className="text-white/80 transition group-hover:translate-x-0.5">→</span>
                      </button>
                    </Link>
                    {!isBasic && (
                      <p className="mt-2 text-center text-xs text-slate-500">
                        El upgrade se configura al completar el registro.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-slate-50">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 bottom-0 h-56 w-56 rounded-full bg-blue-100/60 blur-3xl" />
          <div className="absolute left-0 top-10 h-40 w-40 rounded-full bg-slate-100/80 blur-3xl" />
        </div>

        <div className="container relative mx-auto px-4 py-12 sm:px-6 lg:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
              <Sparkles size={14} />
              Operacion integral
            </span>
            <h2 className="mt-4 text-2xl font-semibold text-slate-900 sm:text-3xl">
              Una plataforma creada para operaciones de domotica
            </h2>
            <p className="mt-3 text-sm text-slate-600 sm:text-base">
              Organiza cada etapa del servicio, desde el registro del cliente hasta la entrega final.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <CalendarCheck size={20} />
                </span>
                <h3 className="text-base font-semibold text-slate-900">Agenda inteligente</h3>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Programa visitas tecnicas, asigna recursos y coordina al equipo con claridad.
              </p>
              <div className="mt-4 h-1 w-10 rounded-full bg-blue-100 transition group-hover:w-16 group-hover:bg-blue-200" />
            </div>
            <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <ShieldCheck size={20} />
                </span>
                <h3 className="text-base font-semibold text-slate-900">Roles y permisos</h3>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Controla accesos por area y reduce riesgos operativos con permisos por equipo.
              </p>
              <div className="mt-4 h-1 w-10 rounded-full bg-blue-100 transition group-hover:w-16 group-hover:bg-blue-200" />
            </div>
            <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <BarChart3 size={20} />
                </span>
                <h3 className="text-base font-semibold text-slate-900">Indicadores claros</h3>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Mide productividad, avances y carga de trabajo en tiempo real.
              </p>
              <div className="mt-4 h-1 w-10 rounded-full bg-blue-100 transition group-hover:w-16 group-hover:bg-blue-200" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="container mx-auto px-4 py-12 sm:px-6 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-lg font-semibold text-slate-900">Flujo operativo en minutos</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  Registra clientes y proyectos con datos completos.
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  Convierte solicitudes en tickets asignados.
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  Coordina visitas y seguimiento desde el calendario.
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-to-br from-blue-50 via-white to-slate-50 p-6">
              <h3 className="text-lg font-semibold text-slate-900">Listo para equipos en crecimiento</h3>
              <p className="mt-3 text-sm text-slate-600">
                SmartOps acompana desde empresas pequeñas hasta operaciones con multiples tecnicos,
                con un panel unificado y permisos precisos.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                  Historial por cliente
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                  Control de inventario
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                  Reportes operativos
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                  Seguimiento de SLA
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 hidden">
        <div className="container mx-auto px-4 py-12 sm:px-6 lg:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
              <ShieldCheck size={14} />
              Planes y límites
            </span>
            <h2 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">Elige el plan ideal para tu operación</h2>
            <p className="mt-3 text-sm text-slate-600 sm:text-base">
              Empieza gratis y haz upgrade cuando tu equipo o tus instalaciones crezcan.
            </p>
            {plansError && (
              <p className="mt-4 text-xs text-slate-500">
                Mostrando planes por defecto (no se pudo cargar desde Supabase).
              </p>
            )}
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {visiblePlans.slice(0, 3).map((plan) => {
              const isBasic = plan.key === "basic";
              const isFeatured = plan.key === "pro";
              const limits = plan.limits;
              return (
                <div
                  key={plan.key}
                  className={[
                    "group relative overflow-hidden rounded-2xl border bg-white p-6 shadow-sm transition",
                    isFeatured ? "border-blue-200 shadow-blue-100" : "border-slate-200",
                  ].join(" ")}
                >
                  {isFeatured && (
                    <div className="absolute right-4 top-4 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Más popular
                    </div>
                  )}

                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                      <p className="mt-1 text-sm text-slate-600">{plan.description ?? ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-slate-900">{formatPrice(plan.price, plan.billingCycle)}</p>
                      <p className="mt-1 text-xs text-slate-500">Facturación {plan.billingCycle === "annual" ? "anual" : "mensual"}</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Límites</p>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <div>
                        <dt className="text-xs text-slate-500">Usuarios</dt>
                        <dd className="font-semibold text-slate-900">{formatLimit(limits?.maxTechnicians)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Sitios</dt>
                        <dd className="font-semibold text-slate-900">{formatLimit(limits?.maxSites)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Dispositivos</dt>
                        <dd className="font-semibold text-slate-900">{formatLimit(limits?.maxDevices)}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-xs text-slate-500">Tickets / mes</dt>
                        <dd className="font-semibold text-slate-900">{formatLimit(limits?.maxTicketsPerMonth)}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Funcionalidades</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-700">
                      <li className="flex items-center justify-between gap-3">
                        <span>Simulador</span>
                        {limits?.allowSimulator ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                            <Check size={14} /> Sí
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                            <X size={14} /> No
                          </span>
                        )}
                      </li>
                      <li className="flex items-center justify-between gap-3">
                        <span>Automatizaciones avanzadas</span>
                        {limits?.allowAdvancedAutomations ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                            <Check size={14} /> Sí
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                            <X size={14} /> No
                          </span>
                        )}
                      </li>
                    </ul>
                  </div>

                  <div className="mt-6">
                    <Link to={isBasic ? "/register" : "/register"}>
                      <button
                        className={[
                          "inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
                          isFeatured
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-slate-900 text-white hover:bg-slate-800",
                        ].join(" ")}
                      >
                        {isBasic ? "Empezar gratis" : "Elegir plan"}
                        <span className="text-white/80 transition group-hover:translate-x-0.5">→</span>
                      </button>
                    </Link>
                    {!isBasic && (
                      <p className="mt-2 text-center text-xs text-slate-500">
                        El upgrade se configura al completar el registro.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-200">
        <div className="container mx-auto px-4 py-12 sm:px-6 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-3">
            <div>
              <div className="flex items-center gap-2">
                <img className="h-9 w-auto" src={logoImg} alt="Logo" />
                <span className="text-lg font-semibold text-white">SmartOps</span>
              </div>
              <p className="mt-4 text-sm text-slate-300">
                Plataforma de gestion operativa para empresas de domotica. Centraliza clientes,
                tickets, inventario y visitas tecnicas con control total.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-white">Producto</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  <li>Agenda inteligente</li>
                  <li>Gestion de clientes</li>
                  <li>Roles y permisos</li>
                  <li>Control de inventario</li>
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Operaciones</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  <li>Seguimiento de tickets</li>
                  <li>Reportes y metricas</li>
                  <li>Alertas de servicio</li>
                  <li>Panel ejecutivo</li>
                </ul>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-5">
              <p className="text-sm font-semibold text-white">Contacto comercial</p>
              <p className="mt-3 text-sm text-slate-300">
                ¿Quieres una demo o una implementacion guiada? Nuestro equipo te ayuda a iniciar
                rapido y sin fricciones.
              </p>
              <div className="mt-4 inline-flex rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white">
                soporte@smartops.app
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-700 pt-6 text-xs text-slate-400">
            © 2026 SmartOps. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </header>
  );
};

export default Landing;
