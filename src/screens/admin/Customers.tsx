import { useMemo, useState } from "react";
import { Building2, Home, Store, Users } from "lucide-react";
import Button from "../../components/Button";
import { PERMISSIONS } from "../../constants/permissions";
import { useAuth } from "../../hooks/useAuth";
import CustomerDeleteModal from "../../components/CustomerDeleteModal";
import CustomerFilters from "../../components/CustomerFilters";
import CustomerModal from "../../components/CustomerModal";
import CustomerTable from "../../components/CustomerTable";
import { useCustomers } from "../../hooks/useCustomers";
import { notifications } from "../../services/notification.service";
import type { Customer, CustomerInput } from "../../types/customer.types";

export default function Customers() {
  const { companyProfile, canAccess } = useAuth();
  const companyId = companyProfile?.id ?? null;
  const canWrite = useMemo(() => {
    return (
      canAccess("customers:create") ||
      canAccess("customers:update") ||
      canAccess("customers:delete") ||
      canAccess(PERMISSIONS.customersRead)
    );
  }, [canAccess]);

  const {
    items,
    total,
    loading,
    submitting,
    error,
    query,
    totalPages,
    refresh,
    setSearch,
    setType,
    setPage,
    createOne,
    updateOne,
    removeOne,
  } = useCustomers({ companyId, pageSize: 8 });

  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const stats = useMemo(() => {
    return items.reduce(
      (acc, customer) => {
        acc.total += 1;
        if (customer.type === "hogar") acc.hogar += 1;
        if (customer.type === "comercio") acc.comercio += 1;
        if (customer.type === "empresa") acc.empresa += 1;
        return acc;
      },
      { total: 0, hogar: 0, comercio: 0, empresa: 0 }
    );
  }, [items]);

  const openCreateModal = () => {
    setSelectedCustomer(null);
    setModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setSelectedCustomer(null);
  };

  const openDeleteModal = (customer: Customer) => {
    setDeleteTarget(customer);
  };

  const closeDeleteModal = () => {
    if (submitting) return;
    setDeleteTarget(null);
  };

  const handleSubmit = async (payload: CustomerInput) => {
    try {
      if (selectedCustomer) {
        await updateOne(selectedCustomer.id, payload);
      } else {
        await createOne(payload);
      }

      closeModal();
    } catch (err) {
      notifications.error({
        title: "Operacion fallida",
        description: err instanceof Error ? err.message : "No se pudo guardar el cliente.",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await removeOne(deleteTarget.id);
      closeDeleteModal();
    } catch (err) {
      notifications.error({
        title: "No se pudo eliminar",
        description: err instanceof Error ? err.message : "Intenta nuevamente.",
      });
    }
  };

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-linear-to-r from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight">Clientes</h1>
        <p className="mt-2 text-sm text-slate-200">
          Gestiona clientes de <span className="font-semibold text-white">{companyProfile?.name ?? "tu compania"}</span> con aislamiento multi-tenant.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">En pagina</p>
            <Users size={16} className="text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.total}</p>
        </article>

        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-emerald-700">Hogar</p>
            <Home size={16} className="text-emerald-700" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-emerald-800">{stats.hogar}</p>
        </article>

        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-amber-700">Comercio</p>
            <Store size={16} className="text-amber-700" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-amber-800">{stats.comercio}</p>
        </article>

        <article className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-cyan-700">Empresa</p>
            <Building2 size={16} className="text-cyan-700" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-cyan-800">{stats.empresa}</p>
        </article>
      </div>

      <CustomerFilters
        search={query.search}
        type={query.type}
        onSearchChange={setSearch}
        onTypeChange={setType}
        onCreate={openCreateModal}
        disabled={loading || submitting || !canWrite}
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Error cargando clientes</p>
          <p className="mt-1">{error}</p>
          <div className="mt-3">
            <Button
              type="button"
              onClick={() => void refresh()}
              className="border-red-300 bg-white text-red-700 hover:bg-red-100"
            >
              Reintentar
            </Button>
          </div>
        </div>
      )}

      {!error && loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Cargando clientes...
        </div>
      )}

      {!error && !loading && items.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">No hay clientes registrados</h3>
          <p className="mt-1 text-sm text-slate-500">
            Crea el primer cliente para comenzar a operar en este tenant.
          </p>
          <div className="mt-5">
            <Button
              type="button"
              onClick={openCreateModal}
              disabled={!canWrite}
              className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
            >
              Crear cliente
            </Button>
          </div>
        </div>
      )}

      {!error && !loading && items.length > 0 && (
        <CustomerTable
          items={items}
          page={query.page}
          total={total}
          totalPages={totalPages}
          disabled={submitting || !canWrite}
          onEdit={openEditModal}
          onDelete={openDeleteModal}
          onPageChange={setPage}
        />
      )}

      <CustomerModal
        open={isModalOpen}
        customer={selectedCustomer}
        submitting={submitting}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      <CustomerDeleteModal
        open={Boolean(deleteTarget)}
        customer={deleteTarget}
        submitting={submitting}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
      />
    </section>
  );
}
