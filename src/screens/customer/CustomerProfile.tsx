import { UserRound } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export default function CustomerProfile() {
  const { userProfile, companyProfile } = useAuth();

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Mi perfil</h1>
        <p className="mt-1 text-sm text-slate-500">Informacion basica del cliente.</p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <UserRound size={32} className="text-slate-500" />
          <div>
            <p className="text-sm text-slate-500">Nombre</p>
            <p className="text-base font-semibold text-slate-900">{userProfile?.name ?? "Cliente"}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-slate-600">
          <div>
            <p className="text-xs font-semibold text-slate-500">Empresa</p>
            <p className="mt-1 text-slate-800">{companyProfile?.name ?? "N/D"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Cedula</p>
            <p className="mt-1 text-slate-800">{userProfile?.idCard ?? "N/D"}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
