import { FileText } from "lucide-react";
import type { CustomerContractPlan } from "../../../../types/customerProfile360.types";
import EmptyState from "../../../../components/EmptyState";
import { formatDate, formatMoney } from "../utils";

interface ContractsSectionProps {
  contracts: CustomerContractPlan[];
}

export default function ContractsSection({ contracts }: ContractsSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <FileText size={16} />
        Contratos / Planes
      </h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {contracts.length === 0 ? (
          <EmptyState text="No hay contratos o planes." />
        ) : (
          contracts.map((contract) => (
            <article key={contract.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">{contract.planName}</p>
              <p className="mt-1 text-sm text-slate-700">Estado: {contract.status}</p>
              <p className="mt-1 text-sm text-slate-700">
                Monto: {formatMoney(contract.amount, contract.currency)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Vigencia: {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
