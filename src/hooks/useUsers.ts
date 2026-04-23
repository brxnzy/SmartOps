import { useCallback, useEffect, useMemo, useState } from "react";
import { notifications } from "../services/notification.service";
import { getRolesByCompany } from "../services/role.service";
import {
  createUserWithInvitation,
  listCompanyUsersStatus,
  listUsers,
  setCompanyUserDisabledState,
  updateUserRole,
} from "../services/users.service";
import type { Role } from "../types/Role";
import type { CompanyUser, CompanyUserInput, CompanyUsersResult } from "../types/userManagement.types";

interface UseUsersOptions {
  companyId: string | null;
  invitedByUserId?: string | null;
  pageSize?: number;
}

interface UsersQueryState {
  page: number;
  pageSize: number;
  search: string;
  roleId: string | "all";
}

interface UserSubmitOptions {
  invitationEmail?: string;
}

function isCustomerRoleName(roleName: string | null | undefined): boolean {
  if (!roleName) return false;
  const normalized = roleName.trim().toLowerCase();
  return normalized === "customer" || normalized === "cliente" || normalized === "clientes";
}

export function useUsers({ companyId, invitedByUserId, pageSize = 10 }: UseUsersOptions) {
  const [items, setItems] = useState<CompanyUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<UsersQueryState>({
    page: 1,
    pageSize,
    search: "",
    roleId: "all",
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CompanyUser | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(query.search.trim());
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [query.search]);

  const loadRoles = useCallback(async () => {
    try {
      const loadedRoles = await getRolesByCompany(companyId);
      setRoles(loadedRoles.filter((role) => !isCustomerRoleName(role.name)));
    } catch (err) {
      console.error(err);
      notifications.error({
        title: "Error cargando roles",
        description: "No se pudieron cargar los roles disponibles para usuarios.",
      });
    }
  }, [companyId]);

  const fetchUsers = useCallback(async () => {
    if (!companyId) {
      setItems([]);
      setTotal(0);
      setError("No se encontro la compania del usuario autenticado.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result: CompanyUsersResult = await listUsers(companyId, {
        page: query.page,
        pageSize: query.pageSize,
        search: debouncedSearch || undefined,
        roleId: query.roleId === "all" ? undefined : query.roleId,
      });

      let mergedItems = result.items.filter((item) => !isCustomerRoleName(item.roleName));

      try {
        const statuses = await listCompanyUsersStatus(companyId);
        const statusByUserId = new Map(statuses.map((status) => [status.userId, status]));

        mergedItems = result.items.map((item) => {
          const status = statusByUserId.get(item.id);
          if (!status) return item;

          return {
            ...item,
            bannedUntil: status.bannedUntil,
            isDisabled: status.isDisabled,
          };
        });
      } catch (statusError) {
        console.error(statusError);
      }

      setItems(mergedItems);
      setTotal(result.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error cargando usuarios.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [companyId, debouncedSearch, query.page, query.pageSize, query.roleId]);

  useEffect(() => {
    void Promise.all([fetchUsers(), loadRoles()]);
  }, [fetchUsers, loadRoles]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / query.pageSize)), [total, query.pageSize]);

  const setSearch = useCallback((search: string) => {
    setQuery((prev) => ({ ...prev, search, page: 1 }));
  }, []);

  const setRoleId = useCallback((roleId: string | "all") => {
    setQuery((prev) => ({ ...prev, roleId, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setQuery((prev) => ({ ...prev, page }));
  }, []);

  const createOne = useCallback(
    async (input: CompanyUserInput, options?: UserSubmitOptions) => {
      if (!companyId) throw new Error("No se encontro compania para crear usuarios.");

      setSubmitting(true);
      try {
        if (!invitedByUserId) {
          throw new Error("No se encontro usuario autenticado para registrar la invitacion.");
        }

        if (!options?.invitationEmail) {
          throw new Error("Debes indicar el email para enviar la invitacion.");
        }

        await createUserWithInvitation(companyId, input, {
          invitationEmail: options.invitationEmail,
          invitedByUserId,
          appBaseUrl: window.location.origin,
        });

        notifications.success({
          title: "Usuario creado",
          description: "Usuario creado e invitacion enviada correctamente.",
        });

        await fetchUsers();
      } finally {
        setSubmitting(false);
      }
    },
    [companyId, fetchUsers, invitedByUserId]
  );

  const updateOne = useCallback(
    async (userId: string, roleId: string) => {
      if (!companyId) throw new Error("No se encontro compania para actualizar usuarios.");

      setSubmitting(true);
      try {
        await updateUserRole(companyId, userId, roleId);

        notifications.success({
          title: "Usuario actualizado",
          description: "El rol del usuario fue actualizado.",
        });

        await fetchUsers();
      } finally {
        setSubmitting(false);
      }
    },
    [companyId, fetchUsers]
  );

  const toggleDisabledOne = useCallback(
    async (user: CompanyUser) => {
      if (!companyId) throw new Error("No se encontro compania para actualizar usuarios.");

      const nextDisabledState = !user.isDisabled;

      setSubmitting(true);
      try {
        await setCompanyUserDisabledState({
          companyId,
          targetUserId: user.id,
          disabled: nextDisabledState,
        });

        notifications.success({
          title: nextDisabledState ? "Usuario deshabilitado" : "Usuario habilitado",
          description: nextDisabledState
            ? "El usuario quedo bloqueado para iniciar sesion."
            : "El usuario ya puede iniciar sesion nuevamente.",
        });

        await fetchUsers();
      } finally {
        setSubmitting(false);
      }
    },
    [companyId, fetchUsers]
  );

  const openCreateModal = () => {
    setSelectedUser(null);
    setModalOpen(true);
  };

  const openEditModal = (user: CompanyUser) => {
    setSelectedUser(user);
    setModalOpen(true);
  };

  const closeModal = (force = false) => {
    if (submitting && !force) return;
    setModalOpen(false);
    setSelectedUser(null);
  };

  const handleSubmit = async (payload: CompanyUserInput, options: UserSubmitOptions) => {
    try {
      if (selectedUser) {
        await updateOne(selectedUser.id, payload.roleId);
      } else {
        await createOne(payload, options);
      }
      closeModal(true);
    } catch (err) {
      notifications.error({
        title: "Operacion fallida",
        description: err instanceof Error ? err.message : "No se pudo guardar el usuario.",
      });
    }
  };

  return {
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
    toggleUserDisabled: toggleDisabledOne,
    refresh: fetchUsers,
    setSearch,
    setRoleId,
    setPage,
  };
}
