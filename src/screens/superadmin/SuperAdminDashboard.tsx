import { Building2, Search, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import Input from "../../components/Input";
import { getSuperadminOverview } from "../../services/superadmin.service";
import type { SuperadminOverview } from "../../types/superadmin";
import { formatDate, initialsFromName } from "../../utils/utils";

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<SuperadminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadOverview = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getSuperadminOverview();
        setOverview(response);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "No se pudo cargar el resumen de superadmin."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadOverview();
  }, []);

  const filteredCompanies = useMemo(() => {
    const companies = overview?.companies ?? [];
    const query = search.trim().toLowerCase();

    if (!query) return companies;

    return companies.filter((company) => company.name.toLowerCase().includes(query));
  }, [overview?.companies, search]);

  return (
    <section className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-linear-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-sm">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -bottom-20 left-8 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
            Superadmin
          </p>
          <h1 className="text-3xl font-semibold">Resumen general</h1>
          <p className="max-w-2xl text-sm text-slate-200/90">
            Vista de solo lectura para revisar companias registradas y sus usuarios.
          </p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Companias registradas</p>
            <Building2 size={16} className="text-slate-400" />
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {loading ? "--" : overview?.companiesCount ?? 0}
          </p>
        </article>

        <article className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-cyan-700">Usuarios totales</p>
            <Users size={16} className="text-cyan-700" />
          </div>
          <p className="mt-2 text-3xl font-semibold text-cyan-900">
            {loading ? "--" : overview?.totalUsers ?? 0}
          </p>
        </article>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Companias</h2>
            <p className="text-sm text-slate-500">
              Selecciona una compania para ver el listado completo de usuarios.
            </p>
          </div>

          <div className="w-full md:max-w-sm">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar compania por nombre..."
              className="w-full"
              icon={<Search size={16} />}
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          <p className="font-semibold">No se pudo cargar el modulo</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Cargando companias...
        </div>
      ) : null}

      {!loading && !error && filteredCompanies.length === 0 ? (
        <EmptyState text="No se encontraron companias para esa busqueda." />
      ) : null}

      {!loading && !error ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredCompanies.map((company) => (
            <article
              key={company.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                  {company.logoUrl ? (
                    <img
                      src={company.logoUrl}
                      alt={`Logo ${company.name}`}
                      className="h-16 w-16 rounded-2xl border border-slate-200 bg-white object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-lg font-semibold text-slate-500">
                      {initialsFromName(company.name)}
                    </div>
                  )}

                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-slate-900">{company.name}</h3>
                    <p className="text-sm text-slate-500">
                      Creada: {formatDate(company.createdAt)}
                    </p>
                    <p className="text-sm text-slate-600">
                      {company.totalUsers} usuario{company.totalUsers === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => navigate(`/superadmin/companies/${company.id}`)}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  Ver detalle
                </Button>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Usuarios recientes
                </p>

                {company.users.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    Esta compania todavia no tiene usuarios registrados.
                  </p>
                ) : (
                  company.users.slice(0, 3).map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      {user.photoUrl ? (
                        <img
                          src={user.photoUrl}
                          alt={user.name}
                          className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-500">
                          {initialsFromName(user.name)}
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
                        <p className="truncate text-xs text-slate-500">
                          {user.email ?? "Sin email"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
