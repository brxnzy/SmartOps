import { ReceiptText } from "lucide-react";
import type { CustomerBillingRecord } from "../../../../types/customerProfile360.types";
import EmptyState from "../../../../components/EmptyState";
import { formatMoney } from "../utils";

interface BillingSectionProps {
  billing: CustomerBillingRecord[];
}

export default function BillingSection({ billing }: BillingSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <ReceiptText size={16} />
        Facturas / Pagos
      </h2>
      <div className="mt-4 space-y-2">
        {billing.length === 0 ? (
          <EmptyState text="No hay facturas ni pagos." />
        ) : (
          billing.map((item) => (
            <div key={`${item.kind}-${item.id}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">
                  {item.kind === "invoice" ? "Factura" : "Pago"} {item.reference}
                </p>
                <p className="font-semibold text-slate-900">{formatMoney(item.amount, item.currency)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
