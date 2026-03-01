import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import { SIDEBAR_ITEMS } from "../constants/navigation";
import { useAuth } from "../hooks/useAuth";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, userProfile, roleProfile, companyProfile, canAccess } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleSidebarItems = SIDEBAR_ITEMS.filter((item) => canAccess(item.permission));

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="relative flex min-h-screen w-full bg-slate-100">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menu"
          className="fixed inset-0 z-40 bg-slate-900/35 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-[82%] max-w-75 flex-col border-r border-slate-200
          bg-slate-50 px-6 py-8 shadow-sm transition-transform duration-300 ease-out
          lg:static lg:z-auto lg:w-full lg:max-w-75 lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="mb-8 flex items-center gap-3">
          <img src={logo} alt="SmartOps logo" className="h-12 w-auto object-contain" />
          <span className="text-xl font-semibold text-slate-800">SmartOps</span>
        </div>

        <nav className="space-y-2">
          {visibleSidebarItems.map((item) => (
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
              <span>
                {item.icon}
              </span>
              <span>{item.name}</span>
            </NavLink>
          ))}

          {visibleSidebarItems.length === 0 && (
            <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
              No tienes modulos disponibles.
            </p>
          )}
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
            onClick={() => setMobileOpen((current) => !current)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100"
            aria-label={mobileOpen ? "Cerrar menu" : "Abrir menu"}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="text-sm font-semibold text-slate-700">SmartOps</span>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
