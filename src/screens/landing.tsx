import landingImg from "../assets/landing.svg";
import logoImg from "../assets/logo.png";
import { Link } from "react-router-dom";
import { BarChart3, CalendarCheck, CircleUserRound, ShieldCheck, Sparkles } from "lucide-react";
import useAuth from "../hooks/useAuth";

const Landing: React.FC = () => {
  const { authUser, userProfile } = useAuth();

  const isAuthenticated = Boolean(authUser);
  const userDisplayName = userProfile?.name ?? "Dashboard";

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
            <Link to="/admin">
              <button className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-xs font-semibold tracking-wide text-white uppercase transition-colors duration-300 hover:bg-blue-600 focus:outline-none sm:px-5 sm:text-sm">
                <CircleUserRound size={18} />
                <span className="max-w-28 truncate normal-case sm:max-w-40">{userDisplayName}</span>
              </button>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <button className="rounded-lg border border-blue-200 px-4 py-2 text-xs font-semibold  tracking-wide text-blue-700 transition-colors duration-300 hover:border-blue-300 hover:bg-blue-50 sm:px-5 sm:text-sm">
                  Login
                </button>
              </Link>
              <Link to="/register">
                <button className="rounded-lg bg-blue-500 px-4 py-2 text-xs font-semibold  tracking-wide text-white transition-colors duration-300 hover:bg-blue-600 sm:px-5 sm:text-sm">
                  Crear cuenta
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
