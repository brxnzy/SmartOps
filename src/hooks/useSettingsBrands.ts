import { useCallback, useEffect, useMemo, useState } from "react";
import { PERMISSIONS } from "../constants/permissions";
import useAuth from "./useAuth";
import { createBrand, deleteBrand, getBrandsByCompany, updateBrand } from "../services/device.service";
import { notifications } from "../services/notification.service";
import type { Brand } from "../types/Device";

const useSettingsBrands = () => {
  const { companyProfile, canAccess } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);
  const [brandName, setBrandName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const companyId = companyProfile?.id ?? null;
  const canCreate = canAccess(PERMISSIONS.settingsBrandsCreate);
  const canUpdate = canAccess(PERMISSIONS.settingsBrandsUpdate);
  const canDelete = canAccess(PERMISSIONS.settingsBrandsDelete);

  const loadBrands = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBrandsByCompany(companyId);
      setBrands(data);
    } catch (error) {
      notifications.error({
        title: "Error cargando marcas",
        description: "No se pudieron obtener las marcas.",
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  const hasChanges = useMemo(() => {
    if (!editingBrand) return Boolean(brandName.trim());
    return brandName.trim() !== editingBrand.name.trim();
  }, [brandName, editingBrand]);

  const filteredBrands = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return brands;

    return brands.filter((brand) => brand.name.toLowerCase().includes(query));
  }, [brands, searchTerm]);

  const openCreateModal = () => {
    setEditingBrand(null);
    setBrandName("");
    setIsModalOpen(true);
  };

  const openEditModal = (brand: Brand) => {
    setEditingBrand(brand);
    setBrandName(brand.name);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setEditingBrand(null);
    setBrandName("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanName = brandName.trim();

    if (!cleanName) return;
    if (!companyId && !editingBrand) {
      notifications.warning({
        title: "Compania requerida",
        description: "No se puede crear una marca sin compania asignada.",
      });
      return;
    }

    setSubmitting(true);
    try {
      if (editingBrand) {
        const updated = await updateBrand({
          id: editingBrand.id,
          name: cleanName,
        });

        setBrands((current) => current.map((item) => (item.id === updated.id ? updated : item)));

        notifications.success({
          title: "Marca actualizada",
          description: "Los cambios fueron guardados correctamente.",
        });
      } else {
        const created = await createBrand({
          name: cleanName,
          companyId: companyId as string,
        });

        setBrands((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));

        notifications.success({
          title: "Marca creada",
          description: "La marca fue creada correctamente.",
        });
      }

      closeModal();
    } catch (error) {
      notifications.error({
        title: editingBrand ? "Error actualizando marca" : "Error creando marca",
        description: "No se pudieron guardar los cambios.",
      });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const askDeleteBrand = (brand: Brand) => {
    setBrandToDelete(brand);
  };

  const cancelDeleteBrand = () => {
    if (submitting) return;
    setBrandToDelete(null);
  };

  const confirmDeleteBrand = async () => {
    if (!brandToDelete) return;
    setSubmitting(true);
    try {
      await deleteBrand(brandToDelete.id);
      setBrands((current) => current.filter((item) => item.id !== brandToDelete.id));
      setBrandToDelete(null);
      notifications.success({
        title: "Marca eliminada",
        description: "La marca fue eliminada.",
      });
    } catch (error) {
      notifications.error({
        title: "Error eliminando marca",
        description: "No se pudo eliminar la marca.",
      });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    brands,
    loading,
    submitting,
    isModalOpen,
    editingBrand,
    brandToDelete,
    brandName,
    searchTerm,
    filteredBrands,
    hasChanges,
    companyId,
    canCreate,
    canUpdate,
    canDelete,
    setBrandName,
    setSearchTerm,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    askDeleteBrand,
    cancelDeleteBrand,
    confirmDeleteBrand,
  };
};

export default useSettingsBrands;
