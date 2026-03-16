import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Button from "../../../components/Button";
import type { Customer360BasicProfile, Customer360TabKey } from "../../../types/customerProfile360.types";
import { formatDate, initialsFromName } from "../../../utils/utils";
import EditCustomerModal from "../../../modals/ModalsCustomer/EditCustomerModal";
import QuoteModal from "../../../modals/ModalsCustomer/QuoteModal";
import TicketModal from "../../../modals/ModalsCustomer/TicketModal";

interface TabItem {
  key: Customer360TabKey;
  label: string;
  count: number;
}

interface CustomerHeaderProps {
  profile: Customer360BasicProfile;
  tabs: TabItem[];
  activeTab: Customer360TabKey;
  onTabChange: (tab: Customer360TabKey) => void;
  companyId: string | null;
  customerId: string | undefined;
  onRefresh: () => Promise<void>;
}

export default function CustomerHeader({
  profile,
  tabs,
  activeTab,
  onTabChange,
  companyId,
  customerId,
  onRefresh,
}: CustomerHeaderProps) {
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isTicketModalOpen, setTicketModalOpen] = useState(false);
  const [isQuoteModalOpen, setQuoteModalOpen] = useState(false);
  const initials = initialsFromName(profile.name);

  return (
    <>
      <header className="rounded-2xl border border-slate-200 bg-linear-to-r from-slate-900 via-slate-800 to-blue-900 p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-500 text-2xl font-bold text-white shadow-sm">
              {initials}
            </div>
            <div>
              <Link
                to="/admin/customers"
                className="absolute left-4 items-center gap-2 text-sm font-medium text-slate-200 hover:text-white"
              >
                <ArrowLeft size={16} />
                Volver a clientes
              </Link>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{profile.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-200 sm:text-sm">
                <span className="rounded-md border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-emerald-200">
                  {profile.invitationStatus}
                </span>
                <span>ID: {profile.id.slice(0, 8)}</span>
                <span>Tax ID: {profile.taxId}</span>
                <span>Tipo: {profile.type}</span>
              </div>
              <p className="mt-1 text-xs text-slate-300 sm:text-sm">
                Documento: {profile.idCard ?? "N/A"} | Telefono: {profile.phone ?? "N/A"} | Alta:{" "}
                {formatDate(profile.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => setEditModalOpen(true)}
              className="border-slate-500 bg-slate-700/70 text-white hover:bg-slate-600"
            >
              Editar
            </Button>
            <Button
              type="button"
              onClick={() => setTicketModalOpen(true)}
              className="border-blue-500 bg-blue-600 text-white hover:bg-blue-500"
            >
              Nuevo Ticket
            </Button>
            <Button
              type="button"
              onClick={() => setQuoteModalOpen(true)}
              className="border-cyan-500 bg-cyan-600 text-white hover:bg-cyan-500"
            >
              Nueva Cotizacion
            </Button>
          </div>
        </div>

        <nav className="mt-5 flex flex-wrap gap-2 border-t border-white/15 pt-4">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-none transition ${
                activeTab === tab.key
                  ? "border-blue-300 bg-blue-500/25 text-white"
                  : "border-white/20 bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
            >
              <span>{tab.label}</span>
              <span className="rounded-full bg-black/20 px-2 py-0.5">{tab.count}</span>
            </Button>
          ))}
        </nav>
      </header>

      <EditCustomerModal
        open={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        companyId={companyId}
        customerId={customerId}
        profile={profile}
        onSaved={onRefresh}
      />
      <TicketModal
        profile={profile}
        open={isTicketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        companyId={companyId}
        customerId={customerId}
        onSaved={onRefresh}
      />
      <QuoteModal
        profile={profile}
        open={isQuoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        companyId={companyId}
        customerId={customerId}
        onSaved={onRefresh}
      />
    </>
  );
}
