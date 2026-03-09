import { ShieldCheck, Users } from "lucide-react";
import { useMemo } from "react";
import Button from "../../components/Button";
import UserFilters from "../../components/UserFilters";
import UserModal from "../../components/UserModal";
import UserTable from "../../components/UserTable";
import { PERMISSIONS } from "../../constants/permissions";
import { useAuth } from "../../hooks/useAuth";
import { useUsers } from "../../hooks/useUsers";
import { notifications } from "../../services/notification.service";
import type { CompanyUser } from "../../types/userManagement.types";

export default function UsersAdmin() {
  const { authUser, companyProfile, canAccess } = useAuth();

  const companyId = companyProfile?.id ?? null;
  const canCreate = canAccess(PERMISSIONS.usersCreate);
  const canUpdate = canAccess(PERMISSIONS.usersUpdate);
  const canDisable = canAccess(PERMISSIONS.usersDisable);

  const {
    items,
    roles,
    total,
    loading,
    submitting,
    error,
    query,
    totalPages,
    isModalOpen,
    selectedUser,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    toggleUserDisabled,
    refresh,
    setSearch,
    setRoleId,
    setPage,
  } = useUsers({
    companyId,
    invitedByUserId: authUser?.id,
    pageSize: 8,
  });

  const stats = useMemo(
    () => ({
      total,
      roles: new Set(items.map((item) => item.roleId)).size,
    }),
    [items, total]
  );

  const handleDisableClick = async (user: CompanyUser) => {
    if (user.id === authUser?.id) {
      notifications.warning({
        title: "Accion no permitida",
        description: "No puedes deshabilitar tu propio usuario.",
      });
      return;
    }

    try {
      await toggleUserDisabled(user);
    } catch (error) {
      notifications.error({
        title: "Operacion fallida",
        description: error instanceof Error ? error.message : "No se pudo actualizar el estado del usuario.",
      });
    }
  };

  const handleEditClick = (user: CompanyUser) => {
    if (user.id === authUser?.id) {
      notifications.warning({
        title: "Accion no permitida",
        description: "No puedes editar tu propio usuario desde este modulo.",
      });
      return;
    }

    openEditModal(user);
  };

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-linear-to-r from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight">Usuarios</h1>
        <p className="mt-2 text-sm text-slate-200">
          Gestiona usuarios internos de <span className="font-semibold text-white">{companyProfile?.name ?? "tu compania"}</span> y sus roles.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Total usuarios</p>
            <Users size={16} className="text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.total}</p>
        </article>

        <article className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-indigo-700">Roles activos</p>
            <ShieldCheck size={16} className="text-indigo-700" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-indigo-800">{stats.roles}</p>
        </article>
      </div>

      <UserFilters
        search={query.search}
        roleId={query.roleId}
        roles={roles}
        onSearchChange={setSearch}
        onRoleChange={setRoleId}
        onCreate={openCreateModal}
        canCreate={canCreate}
        disabled={loading || submitting}
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Error cargando usuarios</p>
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
          Cargando usuarios...
        </div>
      )}

      {!error && !loading && items.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">No hay usuarios registrados</h3>
          <p className="mt-1 text-sm text-slate-500">
            Crea el primer usuario interno para comenzar a delegar accesos.
          </p>
          <div className="mt-5">
            <Button
              type="button"
              onClick={openCreateModal}
              disabled={!canCreate}
              className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
            >
              Crear usuario
            </Button>
          </div>
        </div>
      )}

      {!error && !loading && items.length > 0 && (
        <UserTable
          items={items}
          currentUserId={authUser?.id}
          page={query.page}
          total={total}
          totalPages={totalPages}
          disabled={submitting}
          canUpdate={canUpdate}
          canDisable={canDisable}
          onEdit={handleEditClick}
          onDisable={handleDisableClick}
          onPageChange={setPage}
        />
      )}

      <UserModal
        open={isModalOpen}
        user={selectedUser}
        roles={roles}
        submitting={submitting}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </section>
  );
}
