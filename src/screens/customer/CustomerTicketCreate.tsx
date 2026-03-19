import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import CustomerTicketForm from "../../components/tickets/CustomerTicketForm";
import type { TicketListItem } from "../../types/ticketing.types";

export default function CustomerTicketCreate() {
  const navigate = useNavigate();

  const handleSuccess = (ticket: TicketListItem) => {
    navigate(`/customer/tickets/${ticket.id}`);
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Crear ticket</h1>
          <p className="mt-1 text-sm text-slate-500">
            Completa la informacion para reportar la averia.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => navigate("/customer/tickets")}
          className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
        >
          Volver a mis tickets
        </Button>
      </header>

      <CustomerTicketForm
        onSuccess={handleSuccess}
        onCancel={() => navigate("/customer/tickets")}
      />
    </section>
  );
}
