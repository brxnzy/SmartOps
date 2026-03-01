import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "../../components/Button";
import Field from "../../components/Field";
import Input from "../../components/Input";
import { PERMISSIONS } from "../../constants/permissions";
import { useAuth } from "../../hooks/useAuth";
import { notifications } from "../../services/notification.service";
import {
  createRole,
  deleteRole,
  getRolesByCompany,
  updateRole,
  type Role,
} from "../../services/role.service";

export default function Roles() {
  const { companyProfile, canAccess } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [editingName, setEditingName] = useState("");

  const canCreateRole = canAccess(PERMISSIONS.rolesCreate);
  const canUpdateRole = canAccess(PERMISSIONS.rolesUpdate);
  const canDeleteRole = canAccess(PERMISSIONS.rolesDelete);

  const companyId = companyProfile?.id ?? null;

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const loadedRoles = await getRolesByCompany(companyId);
      setRoles(loadedRoles);
    } catch (error) {
      notifications.error({
        title: "Error cargando roles",
        description: "No se pudieron cargar los roles desde Supabase.",
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const companyRolesCount = useMemo(
    () => roles.filter((role) => role.companyId === companyId).length,
    [companyId, roles]
  );

  const handleCreateRole = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = newRoleName.trim();

    if (!cleanName) return;
    if (!companyId) {
      notifications.warning({
        title: "Compania requerida",
        description: "No se puede crear un rol sin compania asignada.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const createdRole = await createRole({ name: cleanName, companyId });
      setRoles((current) => [...current, createdRole].sort((a, b) => a.name.localeCompare(b.name)));
      setNewRoleName("");
      notifications.success({
        title: "Rol creado",
        description: `El rol ${createdRole.name} fue creado correctamente.`,
      });
    } catch (error) {
      notifications.error({
        title: "Error creando rol",
        description: "No se pudo crear el rol.",
      });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (role: Role) => {
    setEditingRoleId(role.id);
    setEditingName(role.name);
  };

  const cancelEdit = () => {
    setEditingRoleId(null);
    setEditingName("");
  };

  const handleUpdateRole = async (roleId: string) => {
    const cleanName = editingName.trim();
    if (!cleanName) return;

    setSubmitting(true);
    try {
      const updatedRole = await updateRole({ id: roleId, name: cleanName });
      setRoles((current) =>
        current
          .map((role) => (role.id === updatedRole.id ? updatedRole : role))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      cancelEdit();
      notifications.success({
        title: "Rol actualizado",
        description: `El rol ${updatedRole.name} fue actualizado correctamente.`,
      });
    } catch (error) {
      notifications.error({
        title: "Error actualizando rol",
        description: "No se pudo actualizar el rol.",
      });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    const accepted = window.confirm(`Eliminar el rol ${role.name}?`);
    if (!accepted) return;

    setSubmitting(true);
    try {
      await deleteRole(role.id);
      setRoles((current) => current.filter((item) => item.id !== role.id));
      notifications.success({
        title: "Rol eliminado",
        description: `El rol ${role.name} fue eliminado.`,
      });
    } catch (error) {
      notifications.error({
        title: "Error eliminando rol",
        description: "No se pudo eliminar el rol.",
      });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold text-slate-800">Roles</h1>
        <p className="text-slate-600">
          Roles de tu compania y el rol global admin obtenido desde Supabase.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-600">
          Compania actual: <span className="font-semibold text-slate-800">{companyProfile?.name ?? "Sin compania"}</span>
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Total roles de tu compania:{" "}
          <span className="font-semibold text-slate-800">{companyRolesCount}</span>
        </p>
      </div>

      {canCreateRole && (
        <form
          onSubmit={handleCreateRole}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <Field label="Nuevo rol">
              <Input
                value={newRoleName}
                onChange={(event) => setNewRoleName(event.target.value)}
                placeholder="Ejemplo: supervisor"
                maxLength={80}
              />
            </Field>
            <Button
              type="submit"
              disabled={submitting || !newRoleName.trim() || !companyId}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              Crear rol
            </Button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Nombre</th>
                {(canUpdateRole || canDeleteRole) && (
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading && (
                <tr>
                  <td
                    className="px-4 py-4 text-slate-500"
                    colSpan={canUpdateRole || canDeleteRole ? 2 : 1}
                  >
                    Cargando roles...
                  </td>
                </tr>
              )}

              {!loading && roles.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-4 text-slate-500"
                    colSpan={canUpdateRole || canDeleteRole ? 2 : 1}
                  >
                    No hay roles disponibles.
                  </td>
                </tr>
              )}

              {!loading &&
                roles.map((role) => {
                  const isEditing = editingRoleId === role.id;
                  const isGlobalAdmin = role.companyId === null && role.name.toLowerCase() === "admin";

                  return (
                    <tr key={role.id} className="align-top">
                      <td className="px-4 py-3 text-slate-800">
                        {isEditing ? (
                          <Input
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            maxLength={80}
                            className="py-2"
                          />
                        ) : (
                          <span className="font-medium">{role.name}</span>
                        )}
                      </td>
                      {(canUpdateRole || canDeleteRole) && (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {canUpdateRole && !isEditing && !isGlobalAdmin && (
                              <Button
                                type="button"
                                onClick={() => startEdit(role)}
                                disabled={submitting}
                                className="border-slate-300 text-slate-700 hover:bg-slate-100"
                              >
                                Editar
                              </Button>
                            )}

                            {canUpdateRole && isEditing && !isGlobalAdmin && (
                              <>
                                <Button
                                  type="button"
                                  onClick={() => handleUpdateRole(role.id)}
                                  disabled={submitting || !editingName.trim()}
                                  className="bg-blue-600 text-white hover:bg-blue-700"
                                >
                                  Guardar
                                </Button>
                                <Button
                                  type="button"
                                  onClick={cancelEdit}
                                  disabled={submitting}
                                  className="border-slate-300 text-slate-700 hover:bg-slate-100"
                                >
                                  Cancelar
                                </Button>
                              </>
                            )}

                            {canDeleteRole && !isEditing && !isGlobalAdmin && (
                              <Button
                                type="button"
                                onClick={() => handleDeleteRole(role)}
                                disabled={submitting}
                                className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                              >
                                Eliminar
                              </Button>
                            )}

                            {isGlobalAdmin && (
                              <span className="self-center text-xs font-medium text-slate-500">
                                Solo lectura
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
