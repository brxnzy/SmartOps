import { useAuth } from "../../hooks/useAuth";

export default function AdminDashboard() {
  const { authUser, userProfile, companyProfile, roleProfile } = useAuth();

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
        <p className="mt-2 text-slate-600">Resumen de la sesion actual y datos base del usuario.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Usuario</h2>
          <dl className="mt-3 space-y-2 text-sm text-slate-700">
            <div>
              <dt className="font-medium text-slate-500">Nombre</dt>
              <dd>{userProfile?.name ?? "No disponible"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Correo</dt>
              <dd>{authUser?.email ?? "No disponible"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Cedula</dt>
              <dd>{userProfile?.idCard ?? "No registrada"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Rol</dt>
              <dd>{roleProfile?.name ?? "Sin rol"}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Compania</h2>
          <dl className="mt-3 space-y-2 text-sm text-slate-700">
            <div>
              <dt className="font-medium text-slate-500">Nombre</dt>
              <dd>{companyProfile?.name ?? "No asignada"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">RNC</dt>
              <dd>{companyProfile?.rnc ?? "No disponible"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Telefono</dt>
              <dd>{companyProfile?.phone ?? "No disponible"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Direccion</dt>
              <dd>{companyProfile?.address ?? "No disponible"}</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  );
}
