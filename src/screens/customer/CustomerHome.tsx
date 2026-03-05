import { LogOut, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function CustomerHome() {
  const navigate = useNavigate();
  const { logout, userProfile, companyProfile } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <section className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Area de cliente</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Bienvenido</h1>
          <p className="mt-2 text-sm text-slate-600">
            Este es tu apartado exclusivo como cliente.
          </p>
        </header>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <UserRound className="text-slate-500" size={28} />
            <div>
              <p className="text-sm text-slate-500">Usuario</p>
              <p className="text-base font-semibold text-slate-900">{userProfile?.name ?? "Cliente"}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Empresa: <span className="font-medium text-slate-800">{companyProfile?.name ?? "N/D"}</span>
          </p>
        </article>

        <div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <LogOut size={16} />
            Cerrar sesion
          </button>
        </div>
      </div>
    </section>
  );
}

