import { MapPin, MapPinned } from "lucide-react";
import Button from "../../../../components/Button";
import EmptyState from "../../../../components/EmptyState";
import { formatDate } from "../../../../utils/utils";
import SiteDeleteModal from "../sites/SiteDeleteModal";
import SiteDetailModal from "../sites/SiteDetailModal";
import SiteModal from "../sites/SiteModal";
import SiteZoneModal from "../sites/SiteZoneModal";
import SiteZonesModal from "../sites/SiteZonesModal";
import type { SitesSectionProps } from "../../../../types/customerProfile360.types";
import useSitesSection from "../../../../hooks/useSitesSection";

export default function SitesSection({
  companyId,
  customerId,
  sites,
  onRefresh,
}: SitesSectionProps) {
  const {
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
  } = useSitesSection({
    companyId,
    customerId,
    sites,
    onRefresh,
  });

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
              {sites.length} sitios registrados
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
                        <div className="flex h-full items-center justify-center bg-linear-to-br from-slate-100 to-slate-200 text-xs font-medium text-slate-500">
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
                        Estado: {site.status}
                      </div>
                    </div>

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          onClick={() => void openSiteDetailModal(site)}
                          className="rounded-full border border-slate-200 bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-none transition hover:bg-slate-800"
                        >
                          Ver detalle
                        </Button>
                        <Button
                          type="button"
                          onClick={() => void openSiteZonesModal(site)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-none transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          Zonas
                        </Button>
                      </div>
                      <Button
                        type="button"
                        onClick={() => openDeleteSiteModal(site)}
                        className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 shadow-none transition hover:bg-red-100"
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

      <SiteZoneModal
        open={isZoneModalOpen}
        onClose={closeZoneModal}
        onSave={handleCreateSiteZone}
        submitting={zoneSubmitting}
        value={zoneName}
        onChange={setZoneName}
        siteName={zoneModalSite?.name}
      />

      <SiteZonesModal
        open={isSiteZonesModalOpen}
        onClose={closeSiteZonesModal}
        site={selectedSite}
        zones={siteZones}
        loading={siteZonesLoading}
        error={siteZonesError}
        onUpdateZone={handleUpdateSiteZone}
        onDeleteZone={handleDeleteSiteZone}
        onAddZone={() => {
          if (selectedSite) {
            closeSiteZonesModal();
            openCreateZoneModal(selectedSite);
          }
        }}
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
        onOpenZones={() => {
          if (selectedSite) {
            void openSiteZonesModal(selectedSite);
          }
        }}
        site={selectedSite}
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
