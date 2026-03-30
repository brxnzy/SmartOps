import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { PERMISSIONS } from "../constants/permissions";
import useAuth from "./useAuth";
import {
  createCompany,
  deleteCompany,
  deleteCompanyLogo,
  listCompanies,
  updateCompany,
  uploadCompanyLogo,
} from "../services/company.service";
import { notifications } from "../services/notification.service";
import type { Company } from "../types/Company";

const useCompanies = () => {
  const { canAccess, companyProfile, refreshProfile } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [rnc, setRnc] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterField, setFilterField] = useState<"all" | "name" | "address" | "phone" | "rnc">("all");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  const canCreate = canAccess(PERMISSIONS.companiesCreate);
  const canUpdate = canAccess(PERMISSIONS.companiesUpdate);
  const canDelete = canAccess(PERMISSIONS.companiesDelete);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listCompanies();
      setCompanies(data);
    } catch (error) {
      notifications.error({
        title: "Error cargando companias",
        description: "No se pudieron obtener las companias.",
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const hasChanges = useMemo(() => {
    const cleanName = name.trim();
    const cleanAddress = address.trim();
    const cleanPhone = phone.trim();
    const cleanRnc = rnc.trim();

    if (!editingCompany) {
      return Boolean(cleanName);
    }

    const nameChanged = cleanName !== editingCompany.name.trim();
    const addressChanged = cleanAddress !== (editingCompany.address ?? "").trim();
    const phoneChanged = cleanPhone !== (editingCompany.phone ?? "").trim();
    const rncChanged = cleanRnc !== (editingCompany.rnc ?? "").trim();
    const logoChanged = Boolean(selectedFile) || (removeLogo && Boolean(editingCompany.logoUrl));

    return nameChanged || addressChanged || phoneChanged || rncChanged || logoChanged;
  }, [address, editingCompany, name, phone, removeLogo, rnc, selectedFile]);

  const filteredCompanies = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return companies;

    return companies.filter((company) => {
      const fields = {
        name: company.name,
        address: company.address ?? "",
        phone: company.phone ?? "",
        rnc: company.rnc ?? "",
      };

      if (filterField === "all") {
        return Object.values(fields)
          .join(" ")
          .toLowerCase()
          .includes(query);
      }

      return fields[filterField].toLowerCase().includes(query);
    });
  }, [companies, filterField, searchTerm]);

  const resetForm = () => {
    setName("");
    setAddress("");
    setPhone("");
    setRnc("");
    setSelectedFile(null);
    setRemoveLogo(false);
    setFileInputKey((current) => current + 1);
  };

  const openCreateModal = () => {
    setEditingCompany(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (company: Company) => {
    setEditingCompany(company);
    setName(company.name);
    setAddress(company.address ?? "");
    setPhone(company.phone ?? "");
    setRnc(company.rnc ?? "");
    setSelectedFile(null);
    setRemoveLogo(false);
    setFileInputKey((current) => current + 1);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setEditingCompany(null);
    resetForm();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file) {
      setRemoveLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setSelectedFile(null);
    setRemoveLogo(true);
    setFileInputKey((current) => current + 1);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanName = name.trim();
    if (!cleanName) return;

    setSubmitting(true);

    try {
      const payload = {
        name: cleanName,
        address: address.trim() || null,
        phone: phone.trim() || null,
        rnc: rnc.trim() || null,
      };

      if (editingCompany) {
        let logoUrl: string | null | undefined = undefined;

        if (selectedFile) {
          logoUrl = await uploadCompanyLogo({ companyId: editingCompany.id, file: selectedFile });
        }

        if (removeLogo) {
          await deleteCompanyLogo(editingCompany.id);
          logoUrl = null;
        }

        const updated = await updateCompany(editingCompany.id, { ...payload, logoUrl });
        setCompanies((current) => current.map((item) => (item.id === updated.id ? updated : item)));

        if (companyProfile?.id && updated.id === companyProfile.id) {
          await refreshProfile();
        }

        notifications.success({
          title: "Compania actualizada",
          description: "Los cambios fueron guardados correctamente.",
        });
      } else {
        let created = await createCompany({ ...payload, logoUrl: null });

        if (selectedFile) {
          const logoUrl = await uploadCompanyLogo({ companyId: created.id, file: selectedFile });
          created = await updateCompany(created.id, { ...payload, logoUrl });
        }

        setCompanies((current) => [created, ...current]);

        notifications.success({
          title: "Compania creada",
          description: "La compania fue creada correctamente.",
        });
      }

      closeModal();
    } catch (error) {
      notifications.error({
        title: editingCompany ? "Error actualizando compania" : "Error creando compania",
        description: "No se pudieron guardar los cambios.",
      });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const askDeleteCompany = (company: Company) => {
    setCompanyToDelete(company);
  };

  const cancelDeleteCompany = () => {
    if (submitting) return;
    setCompanyToDelete(null);
  };

  const confirmDeleteCompany = async () => {
    if (!companyToDelete) return;
    setSubmitting(true);

    try {
      await deleteCompany(companyToDelete.id);
      setCompanies((current) => current.filter((item) => item.id !== companyToDelete.id));
      setCompanyToDelete(null);

      notifications.success({
        title: "Compania eliminada",
        description: "La compania fue eliminada.",
      });
    } catch (error) {
      notifications.error({
        title: "Error eliminando compania",
        description: "No se pudo eliminar la compania.",
      });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    companies,
    loading,
    submitting,
    isModalOpen,
    editingCompany,
    companyToDelete,
    name,
    address,
    phone,
    rnc,
    searchTerm,
    filterField,
    selectedFile,
    removeLogo,
    fileInputKey,
    filteredCompanies,
    hasChanges,
    canCreate,
    canUpdate,
    canDelete,
    setName,
    setAddress,
    setPhone,
    setRnc,
    setSearchTerm,
    setFilterField,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    handleFileChange,
    handleRemoveLogo,
    askDeleteCompany,
    cancelDeleteCompany,
    confirmDeleteCompany,
  };
};

export default useCompanies;
