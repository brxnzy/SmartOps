import { useState } from "react";
import Button from "../../components/Button";
import Checkbox from "../../components/Checkbox";
import Field from "../../components/Field";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import useRoles from "../../hooks/useRoles";
import { formatPermissionCode } from "../../utils/permissions";

export default function Roles() {
  const {
    roles,
    allPermissions,
    rolePermissions,
    loading,
    submitting,
    editingRoleId,
    newRoleName,
    editingName,
    editingPermissionCodes,
    hasEditingChanges,
    companyId,
    canCreateRole,
    canUpdateRole,
    canDeleteRole,
    setNewRoleName,
    setEditingName,
    handleCreateRole,
    startEdit,
    cancelEdit,
    toggleEditingPermission,
    handleUpdateRole,
    handleDeleteRole,
  } = useRoles();

  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const toggleAccordion = (roleId: string) => {
    if (editingRoleId === roleId) {
      cancelEdit();
      setExpandedRoleId(null);
      return;
    }

    setExpandedRoleId((current) => (current === roleId ? null : roleId));
  };

  const handleStartEdit = (roleId: string) => {
    const role = roles.find((item) => item.id === roleId);
    if (!role) return;

    startEdit(role);
    setExpandedRoleId(roleId);
  };

  const handleCancelEdit = () => {
    cancelEdit();
    setExpandedRoleId(null);
  };

  const handleCreateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const created = await handleCreateRole();
    if (created) {
      setIsCreateModalOpen(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="px-1 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-800">Roles</h1>

        </div>

        {canCreateRole && (
          <Button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            disabled={!companyId}
            className="bg-blue-600 text-white hover:bg-blue-50"
          >
            Nuevo rol
          </Button>
        )}
      </header>

      <div className="space-y-3">
        {!loading && roles.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            No hay roles disponibles.
          </div>
        )}

        {!loading &&
          roles.map((role) => {
            const isEditing = editingRoleId === role.id;
            const isOpen = isEditing || expandedRoleId === role.id;
            const isGlobalAdmin = role.companyId === null && role.name.toLowerCase() === "admin";
            const rolePermissionCodes = rolePermissions[role.id] ?? [];
            const summaryPermissionCount = rolePermissionCodes.length;

            return (
              <article
                key={role.id}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                  isOpen ? "border-blue-200" : "border-slate-200"
                }`}
              >
                <header className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-slate-800">{role.name}</h2>
                      {isGlobalAdmin && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          Solo lectura
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {summaryPermissionCount} permiso{summaryPermissionCount === 1 ? "" : "s"} asignado
                      {summaryPermissionCount === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {canUpdateRole && !isEditing && !isGlobalAdmin && (
                      <Button
                        type="button"
                        onClick={() => handleStartEdit(role.id)}
                        disabled={submitting}
                        className="border-amber-300 text-amber-700 hover:bg-amber-50"
                      >
                        Editar
                      </Button>
                    )}

                    {canDeleteRole && !isEditing && !isGlobalAdmin && (
                      <Button
                        type="button"
                        onClick={() => handleDeleteRole(role)}
                        disabled={submitting}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        Eliminar
                      </Button>
                    )}

                    <Button
                      type="button"
                      onClick={() => toggleAccordion(role.id)}
                      className="border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                      {isOpen ? "Ocultar" : "Ver permisos"}
                    </Button>
                  </div>
                </header>

                {isOpen && (
                  <div className="space-y-4 border-t border-slate-200 p-4">
                    {isEditing ? (
                      <Field label="Nombre del rol">
                        <Input
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          maxLength={80}
                          className="py-2"
                        />
                      </Field>
                    ) : (
                      <div>
                        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Nombre del rol</p>
                        <p className="mt-1 text-sm font-medium text-slate-800">{role.name}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Permisos</p>

                      {allPermissions.length === 0 ? (
                        <p className="text-sm text-slate-500">No hay permisos disponibles.</p>
                      ) : isEditing ? (
                        <div className="space-y-2">
                          {allPermissions.map((permission) => {
                            const checked = editingPermissionCodes.includes(permission.code);

                            return (
                              <label
                                key={permission.id}
                                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
                              >
                                <span className="text-sm text-slate-700">{formatPermissionCode(permission.code)}</span>
                                <Checkbox
                                  checked={checked}
                                  onChange={() => toggleEditingPermission(permission.code)}
                                />
                              </label>
                            );
                          })}
                        </div>
                      ) : rolePermissionCodes.length > 0 ? (
                        <div className="space-y-2">
                          {rolePermissionCodes.map((permissionCode) => (
                            <div
                              key={permissionCode}
                              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                            >
                              {formatPermissionCode(permissionCode)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">Este rol no tiene permisos asignados.</p>
                      )}
                    </div>

                    {canUpdateRole && isEditing && !isGlobalAdmin && (
                      <div className="flex flex-wrap justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          onClick={() => handleUpdateRole(role.id)}
                          disabled={submitting || !editingName.trim() || !hasEditingChanges}
                          className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                          Guardar cambios
                        </Button>
                        <Button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={submitting}
                          className="border-slate-300 text-slate-700 hover:bg-slate-100"
                        >
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
      </div>

      <Modal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Crear nuevo rol"
        footer={
          <>
            <Button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={submitting}
              className="border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Cerrar
            </Button>
            <Button
              type="submit"
              form="create-role-form"
              disabled={submitting || !newRoleName.trim() || !companyId}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              Crear rol
            </Button>
          </>
        }
      >
        <form id="create-role-form" onSubmit={handleCreateSubmit} className="space-y-3">
          <Field label="Nombre del nuevo rol">
            <Input
              value={newRoleName}
              onChange={(event) => setNewRoleName(event.target.value)}
              placeholder="Ejemplo: supervisor"
              maxLength={80}
            />
          </Field>
          {!companyId && (
            <p className="text-sm text-amber-600">Debes tener una compania asignada para crear roles.</p>
          )}
        </form>
      </Modal>
    </section>
  );
}
