import { useCallback, useEffect, useMemo, useState } from "react";
import { notifications } from "../services/notification.service";
import {
  createCustomer,
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

type CustomerFilterType = CustomerType | "all";

interface UseCustomersOptions {
  companyId: string | null;
  pageSize?: number;
}

interface CustomerQueryState {
  page: number;
  pageSize: number;
  search: string;
  type: CustomerFilterType;
}

export function useCustomers({ companyId, pageSize = 10 }: UseCustomersOptions) {
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
    async (input: CustomerInput) => {
      if (!companyId) throw new Error("No se encontro compania para crear clientes.");

      setSubmitting(true);
      try {
        await createCustomer(companyId, input);
        notifications.success({
          title: "Cliente creado",
          description: "El cliente fue registrado correctamente.",
        });
        await fetchCustomers();
      } finally {
        setSubmitting(false);
      }
    },
    [companyId, fetchCustomers]
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

  return {
    items,
    total,
    loading,
    submitting,
    error,
    query,
    totalPages,
    refresh: fetchCustomers,
    setSearch,
    setType,
    setPage,
    createOne,
    updateOne,
    removeOne,
  };
}
