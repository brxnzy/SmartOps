import { useEffect, useRef } from "react";
import { CircleUserRound, LogOut } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import SIDEBAR_ITEMS from "../constants/navigation";
import { useAuth } from "../hooks/useAuth";
import { notifications } from "../services/notification.service";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, userProfile, roleProfile, companyProfile, canAccess } = useAuth();
  const prevPathRef = useRef(location.pathname);
  const transitionTimeoutRef = useRef<number | null>(null);
  const routeToastIdRef = useRef<string | null>(null);

  const visibleSidebarItems = SIDEBAR_ITEMS.filter((item) => canAccess(item.permission));

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

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100">
      <aside className="flex h-full min-h-0 w-full max-w-75 shrink-0 flex-col border-r border-slate-200 bg-slate-50 px-6 py-8 shadow-sm">
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

      <main className="min-h-0 flex-1 overflow-y-auto p-8 md:p-10">
        <Outlet />
      </main>
    </div>
  );
}
