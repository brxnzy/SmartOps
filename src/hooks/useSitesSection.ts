import type {
  CustomerInstallation,
  CustomerSite,
  CustomerSiteAttachmentAsset,
  CustomerSiteZone,
  SitesSectionProps,
} from "../types/customerProfile360.types";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { notifications } from "../services/notification.service";
import {
  createCustomerSite,
  deleteCustomerSiteWithAttachments,
  getCustomerSiteAttachmentAssets,
  getCustomerSiteZones,
  createCustomerSiteZone,
  updateCustomerSiteZone,
  deleteCustomerSiteZone,
  updateCustomerSite,
  uploadCustomerSiteAttachments,
} from "../services/customerProfile360.service";
import type { SiteFormValues } from "../types/interfaces";
import { DEFAULT_SITE_STATUS, isImageFileName, MAX_SITE_ATTACHMENTS } from "../screens/admin/customerProfile360/sites/utils";

const INITIAL_SITE_VALUES: SiteFormValues = {
  name: "",
  address: "",
};

const useSitesSection = ({
  companyId,
  customerId,
  sites,
  installations,
  onRefresh,
}: SitesSectionProps) => {
  const [isSiteModalOpen, setSiteModalOpen] = useState(false);
  const [isSiteDeleteModalOpen, setSiteDeleteModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [siteValues, setSiteValues] = useState<SiteFormValues>(INITIAL_SITE_VALUES);
  const [selectedSite, setSelectedSite] = useState<CustomerSite | null>(null);
  const [siteAttachments, setSiteAttachments] = useState<
    Array<{ file: File; previewUrl: string | null; isImage: boolean }>
  >([]);
  const siteAttachmentInputRef = useRef<HTMLInputElement | null>(null);
  const [isSiteDetailModalOpen, setSiteDetailModalOpen] = useState(false);
  const [siteDetailAttachments, setSiteDetailAttachments] = useState<CustomerSiteAttachmentAsset[]>([]);
  const [siteDetailLoading, setSiteDetailLoading] = useState(false);
  const [siteDetailError, setSiteDetailError] = useState<string | null>(null);
  const [activeAttachmentIndex, setActiveAttachmentIndex] = useState(0);
  const [siteZones, setSiteZones] = useState<CustomerSiteZone[]>([]);
  const [siteZonesLoading, setSiteZonesLoading] = useState(false);
  const [siteZonesError, setSiteZonesError] = useState<string | null>(null);
  const [isSiteZonesModalOpen, setSiteZonesModalOpen] = useState(false);
  const [isZoneModalOpen, setZoneModalOpen] = useState(false);
  const [zoneModalSite, setZoneModalSite] = useState<CustomerSite | null>(null);
  const [zoneName, setZoneName] = useState("");
  const [zoneSubmitting, setZoneSubmitting] = useState(false);
  const [siteCardPreviews, setSiteCardPreviews] = useState<
    Record<string, CustomerSiteAttachmentAsset | null>
  >({});
  const [siteCardPreviewLoading, setSiteCardPreviewLoading] = useState(false);
  const siteAttachmentsRef = useRef(siteAttachments);

  const installationsBySite = useMemo(() => {
    const map = new Map<string, CustomerInstallation[]>();
    installations.forEach((installation) => {
      if (!installation.siteId) return;
      const current = map.get(installation.siteId);
      if (current) {
        current.push(installation);
        return;
      }
      map.set(installation.siteId, [installation]);
    });
    return map;
  }, [installations]);

  const openCreateSiteModal = () => {
    setSelectedSite(null);
    setSiteValues(INITIAL_SITE_VALUES);
    setSiteAttachments((prev) => {
      prev.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
    if (siteAttachmentInputRef.current) {
      siteAttachmentInputRef.current.value = "";
    }
    setSiteModalOpen(true);
  };

  const openEditSiteModal = (site: CustomerSite) => {
    setSelectedSite(site);
    setSiteValues({
      name: site.name,
      address: site.address,
    });
    setSiteAttachments((prev) => {
      prev.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
    if (siteAttachmentInputRef.current) {
      siteAttachmentInputRef.current.value = "";
    }
    setSiteModalOpen(true);
  };

  const openDeleteSiteModal = (site: CustomerSite) => {
    setSelectedSite(site);
    setSiteDeleteModalOpen(true);
  };

  const openSiteDetailModal = async (site: CustomerSite) => {
    if (!companyId) {
      notifications.error({
        title: "No se pudo abrir el detalle",
        description: "No se encontro la compania activa.",
      });
      return;
    }

    setSelectedSite(site);
    setSiteDetailModalOpen(true);
    setSiteDetailLoading(true);
    setSiteDetailError(null);
    setSiteDetailAttachments([]);
    setActiveAttachmentIndex(0);

    try {
      const assets = await getCustomerSiteAttachmentAssets(companyId, site.id);
      setSiteDetailAttachments(assets);
    } catch (err) {
      setSiteDetailAttachments([]);
      setSiteDetailError(err instanceof Error ? err.message : "No se pudieron cargar los adjuntos.");
    } finally {
      setSiteDetailLoading(false);
    }
  };

  const closeSiteDetailModal = () => {
    setSiteDetailModalOpen(false);
    setSiteDetailAttachments([]);
    setSiteDetailLoading(false);
    setSiteDetailError(null);
    setActiveAttachmentIndex(0);
  };

  const openSiteZonesModal = async (site: CustomerSite) => {
    if (!companyId) {
      notifications.error({
        title: "No se pudieron cargar las zonas",
        description: "No se encontro la compania activa.",
      });
      return;
    }

    setSelectedSite(site);
    setSiteZonesModalOpen(true);
    setSiteZones([]);
    setSiteZonesLoading(true);
    setSiteZonesError(null);

    try {
      const zones = await getCustomerSiteZones(companyId, site.id);
      setSiteZones(zones);
    } catch (err) {
      setSiteZones([]);
      setSiteZonesError(
        err instanceof Error ? err.message : "No se pudieron cargar las zonas del sitio."
      );
    } finally {
      setSiteZonesLoading(false);
    }
  };

  const closeSiteZonesModal = () => {
    setSiteZonesModalOpen(false);
    setSiteZones([]);
    setSiteZonesLoading(false);
    setSiteZonesError(null);
  };

  const openCreateZoneModal = (site: CustomerSite) => {
    setZoneModalSite(site);
    setZoneName("");
    setZoneModalOpen(true);
  };

  const closeZoneModal = () => {
    if (zoneSubmitting) return;
    setZoneModalOpen(false);
    setZoneModalSite(null);
    setZoneName("");
  };

  const closeSiteModals = () => {
    if (submitting) return;
    setSiteModalOpen(false);
    setSiteDeleteModalOpen(false);
    setSelectedSite(null);
    setSiteValues(INITIAL_SITE_VALUES);
    setSiteAttachments((prev) => {
      prev.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
    if (siteAttachmentInputRef.current) {
      siteAttachmentInputRef.current.value = "";
    }
  };

  const handleSiteAttachmentsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setSiteAttachments((prev) => {
      const remaining = MAX_SITE_ATTACHMENTS - prev.length;
      if (remaining <= 0) {
        notifications.warning({
          title: "Limite alcanzado",
          description: `Solo puedes adjuntar hasta ${MAX_SITE_ATTACHMENTS} archivos.`,
        });
        return prev;
      }

      const selected = files.slice(0, remaining);
      if (files.length > remaining) {
        notifications.warning({
          title: "Limite alcanzado",
          description: `Solo se adjuntaron ${remaining} archivos. Maximo ${MAX_SITE_ATTACHMENTS}.`,
        });
      }

      const mapped = selected.map((file) => ({
        file,
        isImage: file.type.startsWith("image/") || isImageFileName(file.name),
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      }));

      return [...prev, ...mapped];
    });

    event.target.value = "";
  };

  const removeSiteAttachment = (index: number) => {
    setSiteAttachments((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return next;
    });
  };

  useEffect(() => {
    siteAttachmentsRef.current = siteAttachments;
  }, [siteAttachments]);

  useEffect(() => {
    return () => {
      siteAttachmentsRef.current.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (activeAttachmentIndex >= siteDetailAttachments.length) {
      setActiveAttachmentIndex(0);
    }
  }, [activeAttachmentIndex, siteDetailAttachments.length]);

  useEffect(() => {
    if (!companyId || sites.length === 0) {
      return;
    }

    let cancelled = false;
    setSiteCardPreviewLoading(true);

    Promise.all(
      sites.map(async (site) => {
        try {
          const assets = await getCustomerSiteAttachmentAssets(companyId, site.id);
          const imageAsset = assets.find((item) => isImageFileName(item.fileName)) ?? null;
          return [site.id, imageAsset] as const;
        } catch {
          return [site.id, null] as const;
        }
      })
    )
      .then((entries) => {
        if (!cancelled) {
          setSiteCardPreviews(Object.fromEntries(entries));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSiteCardPreviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [companyId, sites]);

  const handleSaveSite = async () => {
    if (!companyId || !customerId) return;
    if (!siteValues.name.trim() || !siteValues.address.trim()) {
      notifications.warning({
        title: "Campos requeridos",
        description: "Nombre y direccion del sitio son obligatorios.",
      });
      return;
    }
    if (!selectedSite && siteAttachments.length > MAX_SITE_ATTACHMENTS) {
      notifications.warning({
        title: "Adjuntos invalidos",
        description: `Solo se permiten ${MAX_SITE_ATTACHMENTS} adjuntos por sitio.`,
      });
      return;
    }

    setSubmitting(true);
    try {
      if (selectedSite?.id) {
        await updateCustomerSite(companyId, customerId, {
          siteId: selectedSite.id,
          name: siteValues.name,
          address: siteValues.address,
          city: selectedSite.city ?? null,
          status: selectedSite.status || DEFAULT_SITE_STATUS,
        });
        notifications.success({
          title: "Sitio actualizado",
          description: "El sitio se actualizo correctamente.",
        });
      } else {
        const createdSite = await createCustomerSite(companyId, customerId, {
          name: siteValues.name,
          address: siteValues.address,
          city: null,
          status: DEFAULT_SITE_STATUS,
        });

        if (siteAttachments.length > 0) {
          try {
            await uploadCustomerSiteAttachments(
              companyId,
              createdSite.id,
              siteAttachments.map((item) => item.file)
            );
          } catch (err) {
            const baseMessage =
              err instanceof Error ? err.message : "No se pudieron subir los adjuntos.";
            notifications.warning({
              title: "Adjuntos no subidos",
              description: `${baseMessage} Revisa las politicas RLS y permisos del bucket.`,
            });
          }
        }

        notifications.success({
          title: "Sitio creado",
          description: "El sitio se creo correctamente.",
        });
      }
      closeSiteModals();
      await onRefresh();
    } catch (err) {
      notifications.error({
        title: "No se pudo guardar sitio",
        description: err instanceof Error ? err.message : "Error inesperado.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSite = async () => {
    if (!companyId || !customerId || !selectedSite?.id) return;

    setSubmitting(true);
    try {
      const result = await deleteCustomerSiteWithAttachments(companyId, customerId, selectedSite.id);
      notifications.success({
        title: "Sitio eliminado",
        description: "El sitio se elimino correctamente.",
      });

      if (!result.filesRemoved) {
        notifications.warning({
          title: "Archivos pendientes",
          description:
            result.fileRemovalError ||
            "El sitio se elimino, pero no se pudieron eliminar algunos adjuntos del almacenamiento.",
        });
      }

      closeSiteModals();
      await onRefresh();
    } catch (err) {
      notifications.error({
        title: "No se pudo eliminar sitio",
        description: err instanceof Error ? err.message : "Error inesperado.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSiteZone = async () => {
    if (!companyId || !zoneModalSite?.id) return;
    const trimmed = zoneName.trim();
    if (!trimmed) {
      notifications.warning({
        title: "Nombre requerido",
        description: "Debes ingresar un nombre para la zona.",
      });
      return;
    }

    setZoneSubmitting(true);
    try {
      const created = await createCustomerSiteZone(companyId, zoneModalSite.id, trimmed);
      if (selectedSite?.id === zoneModalSite.id) {
        setSiteZones((prev) => [...prev, created]);
      }
      setSiteZonesError(null);
      notifications.success({
        title: "Zona creada",
        description: `La zona "${created.name}" se agrego al sitio.`,
      });
      setZoneModalOpen(false);
      setZoneModalSite(null);
      setZoneName("");
    } catch (err) {
      notifications.error({
        title: "No se pudo crear la zona",
        description: err instanceof Error ? err.message : "Error inesperado.",
      });
    } finally {
      setZoneSubmitting(false);
    }
  };

  const handleUpdateSiteZone = async (zoneId: string, name: string) => {
    if (!companyId || !selectedSite?.id) return;

    try {
      const updated = await updateCustomerSiteZone(companyId, selectedSite.id, zoneId, name);
      setSiteZones((prev) => prev.map((zone) => (zone.id === updated.id ? updated : zone)));
      setSiteZonesError(null);
      notifications.success({
        title: "Zona actualizada",
        description: `La zona "${updated.name}" se actualizo.`,
      });
    } catch (err) {
      notifications.error({
        title: "No se pudo actualizar la zona",
        description: err instanceof Error ? err.message : "Error inesperado.",
      });
      throw err;
    }
  };

  const handleDeleteSiteZone = async (zoneId: string) => {
    if (!companyId || !selectedSite?.id) return;

    try {
      await deleteCustomerSiteZone(companyId, selectedSite.id, zoneId);
      setSiteZones((prev) => prev.filter((zone) => zone.id !== zoneId));
      setSiteZonesError(null);
      notifications.success({
        title: "Zona eliminada",
        description: "La zona se elimino correctamente.",
      });
    } catch (err) {
      notifications.error({
        title: "No se pudo eliminar la zona",
        description: err instanceof Error ? err.message : "Error inesperado.",
      });
      throw err;
    }
  };

  const selectedSiteInstallations = selectedSite ? installationsBySite.get(selectedSite.id) ?? [] : [];

  return {
    installationsBySite,
    siteCardPreviews,
    siteCardPreviewLoading,
    isSiteModalOpen,
    isSiteDeleteModalOpen,
    submitting,
    siteValues,
    setSiteValues,
    selectedSite,
    siteAttachments,
    siteAttachmentInputRef,
    isSiteDetailModalOpen,
    siteDetailAttachments,
    siteDetailLoading,
    siteDetailError,
    activeAttachmentIndex,
    setActiveAttachmentIndex,
    siteZones,
    siteZonesLoading,
    siteZonesError,
    isSiteZonesModalOpen,
    isZoneModalOpen,
    zoneModalSite,
    zoneName,
    zoneSubmitting,
    setZoneName,
    openCreateSiteModal,
    openEditSiteModal,
    openDeleteSiteModal,
    openSiteDetailModal,
    closeSiteDetailModal,
    openSiteZonesModal,
    closeSiteZonesModal,
    openCreateZoneModal,
    closeZoneModal,
    closeSiteModals,
    handleSiteAttachmentsChange,
    removeSiteAttachment,
    handleSaveSite,
    handleDeleteSite,
    handleCreateSiteZone,
    handleUpdateSiteZone,
    handleDeleteSiteZone,
    selectedSiteInstallations,
  };
};

export default useSitesSection;
