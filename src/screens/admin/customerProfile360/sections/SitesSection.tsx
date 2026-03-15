import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { MapPin, MapPinned } from "lucide-react";
import Button from "../../../../components/Button";
import { notifications } from "../../../../services/notification.service";
import {
  createCustomerSite,
  deleteCustomerSiteWithAttachments,
  getCustomerSiteAttachmentAssets,
  updateCustomerSite,
  uploadCustomerSiteAttachments,
} from "../../../../services/customerProfile360.service";
import type {
  CustomerInstallation,
  CustomerSite,
  CustomerSiteAttachmentAsset,
} from "../../../../types/customerProfile360.types";
import EmptyState from "../../../../components/EmptyState";
import { formatDate } from "../utils";
import SiteDeleteModal from "../sites/SiteDeleteModal";
import SiteDetailModal from "../sites/SiteDetailModal";
import SiteModal from "../sites/SiteModal";
import type { SiteFormValues } from "../sites/types";
import { DEFAULT_SITE_STATUS, isImageFileName, MAX_SITE_ATTACHMENTS } from "../sites/utils";

interface SitesSectionProps {
  companyId: string | null;
  customerId: string | undefined;
  sites: CustomerSite[];
  installations: CustomerInstallation[];
  onRefresh: () => Promise<void>;
}

const INITIAL_SITE_VALUES: SiteFormValues = {
  name: "",
  address: "",
};

export default function SitesSection({
  companyId,
  customerId,
  sites,
  installations,
  onRefresh,
}: SitesSectionProps) {
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
      const attachments = await getCustomerSiteAttachmentAssets(companyId, site.id);
      setSiteDetailAttachments(attachments);
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

  const selectedSiteInstallations = selectedSite ? installationsBySite.get(selectedSite.id) ?? [] : [];

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <MapPinned size={16} />
              Sitios
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {sites.length} sitios registrados - {installations.length} instalaciones vinculadas
            </p>
          </div>
          <Button
            type="button"
            onClick={openCreateSiteModal}
            className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
          >
            Nuevo sitio
          </Button>
        </div>
        {sites.length === 0 ? (
          <div className="mt-4">
            <EmptyState text="No hay sitios registrados." />
          </div>
        ) : (
          <div className="site-cards mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {sites.map((site) => {
                const siteInstallations = installationsBySite.get(site.id) ?? [];
                const preview = siteCardPreviews[site.id];
                return (
                  <article
                    key={site.id}
                    className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="relative h-40 overflow-hidden bg-slate-100">
                      {preview?.url ? (
                        <img src={preview.url} alt={preview.fileName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-xs font-medium text-slate-500">
                          {siteCardPreviewLoading ? "Cargando imagen..." : "Sin imagen"}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-3">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="site-card-title text-sm font-semibold text-slate-900">{site.name}</h3>
                        <span className="whitespace-nowrap text-[11px] font-medium text-slate-500">
                          Fecha: {formatDate(site.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 text-xs text-slate-600">
                        <MapPin size={14} className="mt-0.5 text-slate-400" />
                        <span>{site.address}</span>
                      </div>
                      <div className="mt-2 inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                        Instalaciones: {siteInstallations.length}
                      </div>
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
                      <Button
                        type="button"
                        onClick={() => void openSiteDetailModal(site)}
                        className="border-transparent bg-transparent px-0 py-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700 shadow-none hover:text-slate-900"
                      >
                        Ver detalle
                      </Button>
                      <Button
                        type="button"
                        onClick={() => openDeleteSiteModal(site)}
                        className="border-transparent bg-transparent px-0 py-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-600 shadow-none hover:text-red-700"
                      >
                        Eliminar
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <SiteModal
        open={isSiteModalOpen}
        onClose={closeSiteModals}
        onSave={handleSaveSite}
        submitting={submitting}
        values={siteValues}
        onChange={setSiteValues}
        isEdit={Boolean(selectedSite)}
        attachments={siteAttachments}
        onRemoveAttachment={removeSiteAttachment}
        onAttachmentsChange={handleSiteAttachmentsChange}
        attachmentInputRef={siteAttachmentInputRef}
      />

      <SiteDeleteModal
        open={isSiteDeleteModalOpen}
        onClose={closeSiteModals}
        onConfirm={handleDeleteSite}
        submitting={submitting}
        siteName={selectedSite?.name ?? ""}
      />

      <SiteDetailModal
        open={isSiteDetailModalOpen}
        onClose={closeSiteDetailModal}
        onEdit={() => {
          if (selectedSite) {
            closeSiteDetailModal();
            openEditSiteModal(selectedSite);
          }
        }}
        site={selectedSite}
        installationsCount={selectedSiteInstallations.length}
        attachments={siteDetailAttachments}
        loading={siteDetailLoading}
        error={siteDetailError}
        activeIndex={activeAttachmentIndex}
        onPrev={() =>
          setActiveAttachmentIndex((prev) =>
            (prev - 1 + siteDetailAttachments.length) % siteDetailAttachments.length
          )
        }
        onNext={() =>
          setActiveAttachmentIndex((prev) => (prev + 1) % siteDetailAttachments.length)
        }
        onSelect={(index) => setActiveAttachmentIndex(index)}
      />
    </>
  );
}
