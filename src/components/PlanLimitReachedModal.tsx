import { Link } from "react-router-dom";
import Button from "./Button";
import Modal from "./Modal";

interface PlanLimitReachedModalProps {
  open: boolean;
  onClose: () => void;
  resourceLabel: string;
  planName?: string | null;
}

export default function PlanLimitReachedModal({
  open,
  onClose,
  resourceLabel,
  planName,
}: PlanLimitReachedModalProps) {
  const title = `Has alcanzado el límite de ${resourceLabel}`;
  const subtitle = planName ? `Plan actual: ${planName}` : "Tu plan actual no permite crear más recursos.";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      footer={
        <>
          <Button type="button" onClick={onClose} className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
            Cerrar
          </Button>
          <Link to="/admin/account">
            <Button type="button" className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700">
              Mejorar plan
            </Button>
          </Link>
        </>
      }
    >
      <div className="space-y-2 text-sm text-slate-600">
        <p>No puedes crear más {resourceLabel} con tu plan actual.</p>
        <p>Contacta al administrador o mejora el plan para aumentar tus límites.</p>
      </div>
    </Modal>
  );
}

