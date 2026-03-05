import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PERMISSIONS } from "../constants/permissions";
import useAuth from "./useAuth";
import { notifications } from "../services/notification.service";
import {
  createRole,
  deleteRole,
  getRolesByCompany,
  updateRole,
} from "../services/role.service";

import type { Role } from "../types/Role";
import type { Permission } from "../types/Role";
import {
  getAllPermissions,
  getPermissionsByRoleIds,
  syncRolePermissionIds,

} from "../services/permission.service";

function normalizePermissionCodes(permissionCodes: string[]): string[] {
  return Array.from(new Set(permissionCodes)).sort((a, b) => a.localeCompare(b));
}

function arePermissionsEqual(left: string[], right: string[]): boolean {
  const normalizedLeft = normalizePermissionCodes(left);
  const normalizedRight = normalizePermissionCodes(right);

  if (normalizedLeft.length !== normalizedRight.length) return false;

  return normalizedLeft.every((code, index) => code === normalizedRight[index]);
}

const useRoles = () => {
  const { companyProfile, canAccess } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [editingName, setEditingName] = useState("");
  const [editingPermissionCodes, setEditingPermissionCodes] = useState<string[]>([]);
  const [editingInitialName, setEditingInitialName] = useState("");
  const [editingInitialPermissionCodes, setEditingInitialPermissionCodes] = useState<string[]>([]);
  const loadingToastIdRef = useRef<string | null>(null);

  const companyId = companyProfile?.id ?? null;
  const canCreateRole = canAccess(PERMISSIONS.rolesCreate);
  const canUpdateRole = canAccess(PERMISSIONS.rolesUpdate);
  const canDeleteRole = canAccess(PERMISSIONS.rolesDelete);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const [loadedRoles, loadedPermissions] = await Promise.all([
        getRolesByCompany(companyId),
        getAllPermissions(),
      ]);

      const permissionsByRole = await getPermissionsByRoleIds(loadedRoles.map((role) => role.id));

      setRoles(loadedRoles);
      setAllPermissions(loadedPermissions);
      setRolePermissions(permissionsByRole);
    } catch (error) {
      notifications.error({
        title: "Error cargando roles",
        description: "No se pudieron cargar roles y permisos desde Supabase.",
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    if (loading && !loadingToastIdRef.current) {
      loadingToastIdRef.current = notifications.loading({
        title: "Cargando",
        description: "Obteniendo roles y permisos...",
        duration: null,
      });
      return;
    }

    if (!loading && loadingToastIdRef.current) {
      notifications.dismiss(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    }
  }, [loading]);

  useEffect(
    () => () => {
      if (!loadingToastIdRef.current) return;
      notifications.dismiss(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    },
    []
  );

  const handleCreateRole = useCallback(async (): Promise<boolean> => {
    const cleanName = newRoleName.trim();

    if (!cleanName) return false;
    if (!companyId) {
      notifications.warning({
        title: "Compania requerida",
        description: "No se puede crear un rol sin compania asignada.",
      });
      return false;
    }

    setSubmitting(true);
    try {
      const createdRole = await createRole({ name: cleanName, companyId });

      setRoles((current) => [...current, createdRole].sort((a, b) => a.name.localeCompare(b.name)));
      setRolePermissions((current) => ({ ...current, [createdRole.id]: [] }));
      setNewRoleName("");

      notifications.success({
        title: "Rol creado",
        description: `El rol ${createdRole.name} fue creado correctamente.`,
      });

      return true;
    } catch (error) {
      notifications.error({
        title: "Error creando rol",
        description: "No se pudo crear el rol.",
      });
      console.error(error);
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [companyId, newRoleName]);

  const startEdit = useCallback(
    (role: Role) => {
      const currentPermissions = rolePermissions[role.id] ?? [];

      setEditingRoleId(role.id);
      setEditingName(role.name);
      setEditingInitialName(role.name.trim());

      const normalizedPermissions = normalizePermissionCodes(currentPermissions);
      setEditingPermissionCodes(normalizedPermissions);
      setEditingInitialPermissionCodes(normalizedPermissions);
    },
    [rolePermissions]
  );

  const cancelEdit = useCallback(() => {
    setEditingRoleId(null);
    setEditingName("");
    setEditingPermissionCodes([]);
    setEditingInitialName("");
    setEditingInitialPermissionCodes([]);
  }, []);

  const toggleEditingPermission = useCallback((permissionCode: string) => {
    setEditingPermissionCodes((current) => {
      if (current.includes(permissionCode)) {
        return current.filter((code) => code !== permissionCode);
      }

      return [...current, permissionCode].sort((a, b) => a.localeCompare(b));
    });
  }, []);

  const hasEditingChanges = useMemo(() => {
    if (!editingRoleId) return false;

    const cleanName = editingName.trim();
    const hasNameChanges = cleanName !== editingInitialName;
    const hasPermissionChanges = !arePermissionsEqual(
      editingPermissionCodes,
      editingInitialPermissionCodes
    );

    return hasNameChanges || hasPermissionChanges;
  }, [editingInitialName, editingInitialPermissionCodes, editingName, editingPermissionCodes, editingRoleId]);

  const filteredRoles = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return roles;
    return roles.filter((role) => role.name.toLowerCase().includes(query));
  }, [roles, searchTerm]);

  const handleUpdateRole = useCallback(
    async (roleId: string) => {
      if (roleId !== editingRoleId) return;

      const cleanName = editingName.trim();
      if (!cleanName) return;

      const hasNameChanges = cleanName !== editingInitialName;
      const nextPermissionCodes = normalizePermissionCodes(editingPermissionCodes);
      const hasPermissionChanges = !arePermissionsEqual(nextPermissionCodes, editingInitialPermissionCodes);

      if (!hasNameChanges && !hasPermissionChanges) return;

      setSubmitting(true);
      try {
        let savedRoleName = cleanName;

        if (hasNameChanges) {
          const nextRole = await updateRole({ id: roleId, name: cleanName });
          savedRoleName = nextRole.name;
          setRoles((current) =>
            current
              .map((role) => (role.id === nextRole.id ? nextRole : role))
              .sort((a, b) => a.name.localeCompare(b.name))
          );
        }

        if (hasPermissionChanges) {
          const permissionIds = nextPermissionCodes
            .map((code) => allPermissions.find((permission) => permission.code === code)?.id)
            .filter((value): value is string => Boolean(value));

          if (permissionIds.length !== nextPermissionCodes.length) {
            notifications.error({
              title: "Error actualizando permisos",
              description: "Hay permisos seleccionados que no existen en catalogo.",
            });
            return;
          }

          await syncRolePermissionIds(roleId, permissionIds);
          setRolePermissions((current) => ({
            ...current,
            [roleId]: nextPermissionCodes,
          }));
        }

        cancelEdit();
        notifications.success({
          title: "Rol actualizado",
          description: `Los cambios del rol ${savedRoleName} se guardaron correctamente.`,
        });
      } catch (error) {
        notifications.error({
          title: "Error actualizando rol",
          description: "No se pudieron guardar los cambios del rol.",
        });
        console.error(error);
      } finally {
        setSubmitting(false);
      }
    },
    [
      cancelEdit,
      editingInitialName,
      editingInitialPermissionCodes,
      editingName,
      editingPermissionCodes,
      editingRoleId,
      allPermissions,
    ]
  );

  const askDeleteRole = useCallback((role: Role) => {
    setRoleToDelete(role);
  }, []);

  const cancelDeleteRole = useCallback(() => {
    if (submitting) return;
    setRoleToDelete(null);
  }, [submitting]);

  const confirmDeleteRole = useCallback(async () => {
    if (!roleToDelete) return;
    setSubmitting(true);
    try {
      await deleteRole(roleToDelete.id);
      setRoles((current) => current.filter((item) => item.id !== roleToDelete.id));
      setRolePermissions((current) => {
        const next = { ...current };
        delete next[roleToDelete.id];
        return next;
      });
      setRoleToDelete(null);
      notifications.success({
        title: "Rol eliminado",
        description: `El rol ${roleToDelete.name} fue eliminado.`,
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
  }, [roleToDelete]);

  return {
    roles,
    allPermissions,
    rolePermissions,
    loading,
    submitting,
    editingRoleId,
    roleToDelete,
    searchTerm,
    newRoleName,
    editingName,
    editingPermissionCodes,
    hasEditingChanges,
    filteredRoles,
    companyId,
    canCreateRole,
    canUpdateRole,
    canDeleteRole,
    setNewRoleName,
    setSearchTerm,
    setEditingName,
    handleCreateRole,
    startEdit,
    cancelEdit,
    toggleEditingPermission,
    handleUpdateRole,
    askDeleteRole,
    cancelDeleteRole,
    confirmDeleteRole,
    loadRoles,
  };
};

export default useRoles;
