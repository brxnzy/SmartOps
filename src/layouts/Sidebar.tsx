import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Menu, ShieldAlert, UserRound, X } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";
import useSidebar from "../hooks/useSidebar";
import { notifications } from "../services/notification.service";
import Button from "../components/Button";
import Modal from "../components/Modal";
import { isSuperAdminRole } from "../utils/roles";
import useSupportImpersonation from "../hooks/useSupportImpersonation";

export default function Sidebar() {
  const location = useLocation();
  const {
    mobileOpen,
    userProfile,
    roleProfile,
    companyProfile,
    visibleSidebarItems,
    activePaths,
    closeSidebar,
    toggleSidebar,
    isGroupOpen,
    toggleGroup,
    handleLogout,
  } = useSidebar();
  const prevPathRef = useRef(location.pathname);
  const transitionTimeoutRef = useRef<number | null>(null);
  const routeToastIdRef = useRef<string | null>(null);
  const { active: supportImpersonation, stop: stopSupportImpersonation } = useSupportImpersonation();
  const [exitSupportOpen, setExitSupportOpen] = useState(false);
  const [exitingSupport, setExitingSupport] = useState(false);
  const companyLabel = isSuperAdminRole(roleProfile?.name)
    ? "Vista global"
    : companyProfile?.name ?? "Sin compania";

  const handleExitSupportMode = async () => {
    if (!supportImpersonation) return;
    setExitingSupport(true);
    try {
      await stopSupportImpersonation();
      notifications.success({
        title: "Modo soporte desactivado",
        description: "Volviste a tu sesión de SuperAdmin.",
      });
      setExitSupportOpen(false);
    } catch (error) {
      notifications.error({
        title: "No se pudo salir",
        description: error instanceof Error ? error.message : "No se pudo salir del modo soporte.",
      });
    } finally {
      setExitingSupport(false);
    }
  };

  useEffect(() => {
    const previousPath = prevPathRef.current;
    const currentPath = location.pathname;

    if (previousPath === currentPath) return;

    prevPathRef.current = currentPath;
    routeToastIdRef.current = notifications.loading({
      title: "Cargando modulo",
      description: "Obteniendo informacion de la vista...",
      duration: null,
    });

    if (transitionTimeoutRef.current) {
      window.clearTimeout(transitionTimeoutRef.current);
    }

    transitionTimeoutRef.current = window.setTimeout(() => {
      if (routeToastIdRef.current) {
        notifications.dismiss(routeToastIdRef.current);
        routeToastIdRef.current = null;
      }
      transitionTimeoutRef.current = null;
    }, 650);
  }, [location.pathname]);

  useEffect(
    () => () => {
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }

      if (routeToastIdRef.current) {
        notifications.dismiss(routeToastIdRef.current);
        routeToastIdRef.current = null;
      }
    },
    []
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
          onClick={closeSidebar}
          aria-label="Cerrar menu"
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full min-h-0 w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-50 px-6 py-8 shadow-sm transition-transform duration-200 lg:static lg:w-full lg:max-w-75 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-center gap-3">
          <img
            src={companyProfile?.logoUrl ?? logo}
            alt={companyProfile?.name ? `Logo ${companyProfile.name}` : "SmartOps logo"}
            className="h-12 w-12 rounded-full  object-cover p-1"
          />
          <div className="min-w-0">
            <p className="text-xl font-semibold leading-tight text-slate-800">SmartOps</p>
            <p className="truncate text-xs font-medium text-slate-500">{companyLabel}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto">
          {visibleSidebarItems.map((item) => {
            if (item.children?.length) {
              const childPaths = item.children.map((child) => child.to);
              const groupKey = item.name;
              const open = isGroupOpen(groupKey, childPaths);

              return (
                <div key={item.name} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(groupKey, childPaths)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-md font-medium text-slate-500 transition  hover:text-blue-500"
                  >
                    <span className="flex items-center gap-4">
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  {open ? (
                    <div className="ml-4 space-y-1 border-l border-slate-200 pl-3">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.name}
                          to={child.to}
                          onClick={closeSidebar}
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                              isActive
                                ? " text-blue-500"
                                : "text-slate-500  hover:text-blue-500"
                            }`
                          }
                        >
                          {child.icon ? <span>{child.icon}</span> : null}
                          <span>{child.name}</span>
                        </NavLink>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            }

            if (!item.to) return null;

            return (
              <NavLink
                key={item.name}
                to={item.to}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  `flex items-center gap-4 rounded-xl px-3 py-3 text-left text-md font-medium transition ${
                    isActive
                      ? " text-blue-500 "
                      : "text-slate-500  hover:text-blue-500"
                  }`
                }
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </NavLink>
            );
          })}

          {visibleSidebarItems.length === 0 || activePaths.size === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
              No tienes modulos disponibles.
            </p>
          ) : null}
        </nav>

        <div className="mt-auto space-y-4 pt-8">
          <div className="rounded-2xl text-sm">
            <div className="mt-2 flex items-center gap-3 text-slate-800">
              {userProfile?.photoUrl ? (
                <img
                  src={userProfile.photoUrl}
                  alt={userProfile?.name ?? "Foto de perfil"}
                  className="h-10 w-10 rounded-full object-cover border border-slate-200 bg-white"
                />
              ) : (
                <UserRound size={40} className="text-slate-500" />
              )}
              <p className="truncate font-semibold text-md">
                {userProfile?.name ?? "Usuario"} | {roleProfile?.name ?? "Sin rol"}
              </p>
            </div>
            <p className="mt-1 truncate text-xs text-slate-500"></p>
          </div>

          <Button
            onClick={handleLogout}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-xs transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut size={16} />
            Cerrar sesion
          </Button>
        </div>
      </aside>

      <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-10">
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <button
            type="button"
            onClick={toggleSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100"
            aria-label={mobileOpen ? "Cerrar menu" : "Abrir menu"}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <img
            src={companyProfile?.logoUrl ?? logo}
            alt={companyProfile?.name ? `Logo ${companyProfile.name}` : "SmartOps logo"}
            className="h-12 w-12 rounded-full border border-slate-200 bg-white object-contain p-1"
          />
        </div>

        {supportImpersonation ? (
          <div className="mb-4 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                  <ShieldAlert size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-900">Modo soporte activo</p>
                  <p className="truncate text-xs text-amber-800">
                    Tenant: {supportImpersonation.companyId.slice(0, 8)} · Expira:{" "}
                    {new Intl.DateTimeFormat("es-DO", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(supportImpersonation.expiresAt))}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => setExitSupportOpen(true)}
                className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
              >
                Salir del modo soporte
              </Button>
            </div>
          </div>
        ) : null}

        <Modal
          open={exitSupportOpen}
          onClose={() => setExitSupportOpen(false)}
          title="Salir del modo soporte"
          subtitle="El modo soporte (impersonation) te permite entrar temporalmente al tenant como un admin para diagnosticar. Al salir, vuelves a tu sesión de SuperAdmin."
          size="lg"
          containerClassName="overflow-hidden border border-slate-200 bg-white"
          headerClassName="border-b border-slate-100 bg-white/80 px-6 py-5 backdrop-blur"
          bodyClassName="px-6 py-6"
          footer={
            <>
              <Button
                type="button"
                onClick={() => setExitSupportOpen(false)}
                disabled={exitingSupport}
                className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => void handleExitSupportMode()}
                disabled={exitingSupport || !supportImpersonation}
                className="border-amber-600 bg-amber-600 text-white hover:bg-amber-700"
              >
                {exitingSupport ? "Saliendo..." : "Salir"}
              </Button>
            </>
          }
        >
          {supportImpersonation ? (
            <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">Sesión activa</p>
              <p className="text-xs text-amber-800">
                Tenant: {supportImpersonation.companyId} · Expira:{" "}
                {new Intl.DateTimeFormat("es-DO", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(supportImpersonation.expiresAt))}
              </p>
              <p className="text-xs text-amber-800">
                Todo lo que hagas en el tenant durante el modo soporte se considera una acción de diagnóstico y debe auditarse.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">No hay una sesión de modo soporte activa.</p>
          )}
        </Modal>
        <Outlet />
      </main>
    </div>
  );
}
