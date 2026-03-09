import { useCallback, useEffect, useMemo, useState } from "react";
import { notifications } from "../services/notification.service";
import {
  createCustomerWithInvitation,
  deleteCustomer,
  listCustomers,
  updateCustomer,
} from "../services/customers.service";
import type {
  Customer,
  CustomerInput,
  CustomerType,
  CustomersResult,
} from "../types/customer.types";
import type { CustomerSubmitOptions } from "../types/interfaces";

type CustomerFilterType = CustomerType | "all";

interface UseCustomersOptions {
  companyId: string | null;
  invitedByUserId?: string | null;
  pageSize?: number;
}

interface CustomerQueryState {
  page: number;
  pageSize: number;
  search: string;
  type: CustomerFilterType;
}

export function useCustomers({
  companyId,
  invitedByUserId,
  pageSize = 10,
}: UseCustomersOptions) {
  const [items, setItems] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<CustomerQueryState>({
    page: 1,
    pageSize,
    search: "",
    type: "all",
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(query.search.trim());
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [query.search]);

  const fetchCustomers = useCallback(async () => {
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
      const result: CustomersResult = await listCustomers(companyId, {
        page: query.page,
        pageSize: query.pageSize,
        search: debouncedSearch || undefined,
        type: query.type === "all" ? undefined : query.type,
      });

      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error cargando clientes.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [companyId, debouncedSearch, query.page, query.pageSize, query.type]);

  useEffect(() => {
    void fetchCustomers();
  }, [fetchCustomers]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / query.pageSize)), [total, query.pageSize]);

  const setSearch = useCallback((search: string) => {
    setQuery((prev) => ({ ...prev, search, page: 1 }));
  }, []);

  const setType = useCallback((type: CustomerFilterType) => {
    setQuery((prev) => ({ ...prev, type, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setQuery((prev) => ({ ...prev, page }));
  }, []);

  const createOne = useCallback(
    async (input: CustomerInput, options?: CustomerSubmitOptions) => {
      if (!companyId) throw new Error("No se encontro compania para crear clientes.");

      setSubmitting(true);
      try {
        if (!invitedByUserId) {
          throw new Error("No se encontro usuario autenticado para registrar la invitacion.");
        }

        if (!options?.invitationEmail) {
          throw new Error("Debes indicar el email para enviar la invitacion.");
        }

        await createCustomerWithInvitation(companyId, input, {
          invitationEmail: options.invitationEmail,
          invitedByUserId,
          appBaseUrl: window.location.origin,
        });

        notifications.success({
          title: "Cliente creado",
          description: "Cliente creado e invitacion enviada correctamente.",
        });
        await fetchCustomers();
      } finally {
        setSubmitting(false);
      }
    },
    [companyId, fetchCustomers, invitedByUserId]
  );

  const updateOne = useCallback(
    async (customerId: string, input: CustomerInput) => {
      if (!companyId) throw new Error("No se encontro compania para actualizar clientes.");

      setSubmitting(true);
      try {
        await updateCustomer(companyId, customerId, input);

        notifications.success({
          title: "Cliente actualizado",
          description: "Los datos del cliente fueron actualizados.",
        });
        await fetchCustomers();
      } finally {
        setSubmitting(false);
      }
    },
    [companyId, fetchCustomers]
  );

  const removeOne = useCallback(
    async (customerId: string) => {
      if (!companyId) throw new Error("No se encontro compania para eliminar clientes.");

      setSubmitting(true);
      try {
        await deleteCustomer(companyId, customerId);
        notifications.success({
          title: "Cliente eliminado",
          description: "El cliente fue eliminado correctamente.",
        });
        await fetchCustomers();
      } finally {
        setSubmitting(false);
      }
    },
    [companyId, fetchCustomers]
  );



  //Segunda parte

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

  const closeModal = (force = false) => {
    if (submitting && !force) return;
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

  const handleSubmit = async (payload: CustomerInput, options: CustomerSubmitOptions) => {
    try {
      if (selectedCustomer) {
        await updateOne(selectedCustomer.id, payload);
      } else {
        await createOne(payload, options);
      }
      closeModal(true);
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

  return {
    items,
    total,
    stats,
    isModalOpen,
    loading,
    submitting,
    error,
    query,
    totalPages,
    selectedCustomer,
    deleteTarget,
    closeDeleteModal,
    closeModal,
    handleSubmit,
    handleDelete,
    openDeleteModal,
    openCreateModal,
    openEditModal,
    refresh: fetchCustomers,
    setSearch,
    setType,
    setPage,
    createOne,
    updateOne,
    removeOne,
  };
}
