import { useCallback, useEffect, useMemo, useState } from "react";
import { PERMISSIONS } from "../constants/permissions";
import useAuth from "./useAuth";
import { notifications } from "../services/notification.service";
import {
  createRole,
  deleteRole,
  getRolesByCompany,
  updateRole,
  type Role,
} from "../services/role.service";

const useRoles = () => {
  const { companyProfile, canAccess } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [editingName, setEditingName] = useState("");

  const companyId = companyProfile?.id ?? null;
  const canCreateRole = canAccess(PERMISSIONS.rolesCreate);
  const canUpdateRole = canAccess(PERMISSIONS.rolesUpdate);
  const canDeleteRole = canAccess(PERMISSIONS.rolesDelete);

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

  const handleCreateRole = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
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
    },
    [companyId, newRoleName]
  );

  const startEdit = useCallback((role: Role) => {
    setEditingRoleId(role.id);
    setEditingName(role.name);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingRoleId(null);
    setEditingName("");
  }, []);

  const handleUpdateRole = useCallback(
    async (roleId: string) => {
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
    },
    [cancelEdit, editingName]
  );

  const handleDeleteRole = useCallback(async (role: Role) => {
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
  }, []);

  return {
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
    loadRoles,
  };
};

export default useRoles;
