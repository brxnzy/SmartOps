import Button from "../../components/Button";
import Field from "../../components/Field";
import Input from "../../components/Input";
import useRoles from "../../hooks/useRoles";

export default function Roles() {
  const {
    roles,
    loading,
    submitting,
    editingRoleId,
    newRoleName,
    editingName,
    companyId,
    companyProfile,
    canCreateRole,
    canUpdateRole,
    canDeleteRole,
    companyRolesCount,
    setNewRoleName,
    setEditingName,
    handleCreateRole,
    startEdit,
    cancelEdit,
    handleUpdateRole,
    handleDeleteRole,
  } = useRoles();

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
          Total roles de tu compania: <span className="font-semibold text-slate-800">{companyRolesCount}</span>
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
