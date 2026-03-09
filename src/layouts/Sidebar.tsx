import { useEffect, useRef } from "react";
import { ChevronDown, CircleUserRound, LogOut, Menu, X } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";
import useSidebar from "../hooks/useSidebar";
import { notifications } from "../services/notification.service";

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
          <img src={logo} alt="SmartOps logo" className="h-12 w-auto object-contain" />
          <div className="min-w-0">
            <p className="text-xl font-semibold leading-tight text-slate-800">SmartOps</p>
            <p className="truncate text-xs font-medium text-slate-500">
              {companyProfile?.name ?? "Sin compania"}
            </p>
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
          <div className="rounded-2xl  text-sm">
            <div className="mt-2 flex items-center gap-2 text-slate-800">
              <CircleUserRound size={40} className="text-slate-500" />
              <p className="truncate font-semibold text-md">{userProfile?.name ?? "Usuario"} | {roleProfile?.name ?? "Sin rol"}</p>
            </div>
            <p className="mt-1 truncate text-xs text-slate-500"></p>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-xs transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut size={16} />
            Cerrar sesion
          </button>
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
          <img src={logo} alt="SmartOps logo" className="h-12 w-auto object-contain" />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
