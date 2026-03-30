import Modal from "../../../../components/Modal";
import SiteZonesPanel from "./SiteZonesPanel";
import type { SiteZonesModalProps } from "../../../../types/interfaces";

export default function SiteZonesModal({
  open,
  onClose,
  site,
  zones,
  loading,
  error,
  onUpdateZone,
  onDeleteZone,
  onAddZone,
}: SiteZonesModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Zonas del sitio"
      subtitle={site ? `Sitio: ${site.name}` : "Gestiona las zonas asociadas al sitio."}
      size="lg"
      overlayClassName="backdrop-blur-[8px]"
      backdropClassName="bg-slate-900/40"
      containerClassName="overflow-hidden border border-slate-200 bg-white text-slate-900 shadow-[0_30px_90px_rgba(15,23,42,0.18)]"
      headerClassName="border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-5"
      bodyClassName="bg-slate-50/60 px-6 pb-6 pt-4"
      titleClassName="text-lg font-semibold text-slate-900"
      subtitleClassName="text-xs text-slate-500"
      closeClassName="bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
    >
      {site ? (
        <SiteZonesPanel
          zones={zones}
          loading={loading}
          error={error}
          onUpdate={onUpdateZone}
          onDelete={onDeleteZone}
          onAddZone={onAddZone}
        />
      ) : (
        <p className="text-sm text-slate-500">No hay sitio seleccionado.</p>
      )}
    </Modal>
  );
}
