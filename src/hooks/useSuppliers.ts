import { useCallback, useEffect, useMemo, useState } from "react";
import { PERMISSIONS } from "../constants/permissions";
import useAuth from "./useAuth";
import {
  createSupplier,
  deleteSupplier,
  getSuppliersByCompany,
  updateSupplier,
} from "../services/suppliers.service";
import { notifications } from "../services/notification.service";
import type { Supplier } from "../types/supplier.types";
import { formatPhoneDigits } from "../utils/formatters";
import { hasErrors, toSupplierInput, validateSupplierForm } from "../utils/supplier";

const useSuppliers = () => {
  const { companyProfile, canAccess } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const companyId = companyProfile?.id ?? null;
  const canCreate = canAccess(PERMISSIONS.suppliersCreate);
  const canUpdate = canAccess(PERMISSIONS.suppliersUpdate);
  const canDelete = canAccess(PERMISSIONS.suppliersDelete);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const loadedSuppliers = await getSuppliersByCompany(companyId);
      setSuppliers(loadedSuppliers);
    } catch (error) {
      notifications.error({
        title: "Error cargando proveedores",
        description: "No se pudieron obtener los proveedores.",
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredSuppliers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return suppliers;

    return suppliers.filter((supplier) => {
      const searchable = [
        supplier.name,
        supplier.email ?? "",
        supplier.phone ?? "",
        supplier.address ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [searchTerm, suppliers]);

  const formValues = useMemo(
    () => ({
      name,
      email,
      phone,
      address,
    }),
    [address, email, name, phone]
  );

  const validationErrors = useMemo(() => validateSupplierForm(formValues), [formValues]);
  const isValidForm = useMemo(() => !hasErrors(validationErrors), [validationErrors]);

  const hasChanges = useMemo(() => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = formatPhoneDigits(phone);
    const cleanAddress = address.trim();

    if (!editingSupplier) {
      return Boolean(cleanName);
    }

    return (
      cleanName !== editingSupplier.name.trim() ||
      cleanEmail !== (editingSupplier.email ?? "").trim().toLowerCase() ||
      cleanPhone !== (editingSupplier.phone ?? "") ||
      cleanAddress !== (editingSupplier.address ?? "").trim()
    );
  }, [address, editingSupplier, email, name, phone]);

  const openCreateModal = () => {
    setEditingSupplier(null);
    setName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setIsModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setName(supplier.name);
    setEmail(supplier.email ?? "");
    setPhone(supplier.phone ?? "");
    setAddress(supplier.address ?? "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setEditingSupplier(null);
    setName("");
    setEmail("");
    setPhone("");
    setAddress("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isValidForm) {
      notifications.error({
        title: "Formulario invalido",
        description: "Revisa los campos obligatorios y el formato del email/telefono.",
      });
      return;
    }

    if (!companyId) {
      notifications.error({
        title: "Operacion no disponible",
        description: "No se encontro la compania activa.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = toSupplierInput(formValues);

      if (editingSupplier) {
        await updateSupplier(companyId, editingSupplier.id, payload);
        notifications.success({
          title: "Proveedor actualizado",
          description: "Los datos del proveedor fueron actualizados.",
        });
      } else {
        await createSupplier(companyId, payload);
        notifications.success({
          title: "Proveedor creado",
          description: "Proveedor creado correctamente.",
        });
      }

      await loadData();
      closeModal();
    } catch (error) {
      notifications.error({
        title: "Operacion fallida",
        description: error instanceof Error ? error.message : "No se pudo guardar el proveedor.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const askDeleteSupplier = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
  };

  const cancelDeleteSupplier = () => {
    if (submitting) return;
    setSupplierToDelete(null);
  };

  const confirmDeleteSupplier = async () => {
    if (!supplierToDelete || !companyId) return;

    setSubmitting(true);
    try {
      await deleteSupplier(companyId, supplierToDelete.id);
      notifications.success({
        title: "Proveedor eliminado",
        description: "El proveedor fue eliminado correctamente.",
      });
      await loadData();
      setSupplierToDelete(null);
    } catch (error) {
      notifications.error({
        title: "No se pudo eliminar",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return {
    loading,
    submitting,
    isModalOpen,
    editingSupplier,
    supplierToDelete,
    name,
    email,
    phone,
    address,
    searchTerm,
    filteredSuppliers,
    companyId,
    canCreate,
    canUpdate,
    canDelete,
    hasChanges,
    isValidForm,
    setName,
    setEmail,
    setPhone,
    setAddress,
    setSearchTerm,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    askDeleteSupplier,
    cancelDeleteSupplier,
    confirmDeleteSupplier,
  };
};

export default useSuppliers;
