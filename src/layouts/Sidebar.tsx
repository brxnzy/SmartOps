import { ChevronDown, Menu, X } from "lucide-react";
import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";
import useSidebar from "../hooks/useSidebar";

export default function Sidebar() {
  const location = useLocation();
  const {
    mobileOpen,
    userProfile,
    roleProfile,
    companyProfile,
    visibleSidebarItems,
    closeSidebar,
    toggleSidebar,
    handleLogout,
  } = useSidebar();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const activePaths = useMemo(() => {
    const paths = new Set<string>();

    visibleSidebarItems.forEach((item) => {
      if (item.to) paths.add(item.to);
      item.children?.forEach((child) => paths.add(child.to));
    });

    return paths;
  }, [visibleSidebarItems]);

  const isGroupOpen = (key: string, childPaths: string[]) => {
    if (openGroups[key] !== undefined) return openGroups[key];
    return childPaths.some((path) => location.pathname.startsWith(path));
  };

  const toggleGroup = (key: string, childPaths: string[]) => {
    setOpenGroups((current) => ({ ...current, [key]: !isGroupOpen(key, childPaths) }));
  };

  return (
    <div className="relative flex min-h-screen w-full bg-slate-100">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menu"
          className="fixed inset-0 z-40 bg-slate-900/35 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-[82%] max-w-75 flex-col border-r border-slate-200
          bg-slate-50 px-6 py-8  transition-transform duration-300 ease-out
          lg:static lg:z-auto lg:w-full lg:max-w-75 lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="mb-8 flex items-center gap-3">
          <img src={logo} alt="SmartOps logo" className="h-12 w-auto object-contain" />
          <span className="text-xl font-semibold text-slate-800">SmartOps</span>
        </div>

        <nav className="space-y-2">
          {visibleSidebarItems.map((item) => {
            if (item.children?.length) {
              const childPaths = item.children.map((child) => child.to);
              const groupOpen = isGroupOpen(item.name, childPaths);

              return (
                <div key={item.name} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.name, childPaths)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-md font-medium transition ${
                      groupOpen
                        ? "bg-slate-100 text-blue-600"
                        : "text-slate-500 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    <span className="flex items-center gap-4">
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </span>
                    <ChevronDown
                      size={18}
                      className={`transition-transform ${groupOpen ? "rotate-180" : "rotate-0"}`}
                    />
                  </button>

                  {groupOpen && (
                    <div className="ml-5 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          className={({ isActive }) =>
                            `flex items-center gap-2 px-1 py-2 text-md font-medium transition ${
                              isActive
                                ? "text-blue-600"
                                : "text-slate-500 hover:text-blue-600"
                            }`
                          }
                        >
                          {child.icon ? <span className="text-current">{child.icon}</span> : null}
                          {child.name}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            if (!item.to) return null;

            return (
              <NavLink
                key={item.name}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-4 rounded-xl px-3 py-3 text-left text-md font-medium transition ${
                    isActive
                      ? "bg-white text-blue-500 "
                      : "text-slate-500 hover:bg-white hover:text-slate-900"
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

        <div className="mt-auto space-y-4 pt-10">
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">{userProfile?.name ?? "Usuario"}</p>
            <p>{roleProfile?.name ?? "Sin rol"}</p>
            <p className="truncate text-slate-500">{companyProfile?.name ?? "Sin compania"}</p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full cursor-pointer rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            Cerrar sesion
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10">
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
