import { Building2, Home, Store, UserPen } from "lucide-react";
import Button from "./Button";
import type { Customer } from "../types/customer.types";
import type { CustomerTableProps } from "../types/interfaces";

function formatType(type: Customer["type"]): string {
  if (type === "hogar") return "Hogar";
  if (type === "comercio") return "Comercio";
  return "Empresa";
}

function typeClassName(type: Customer["type"]): string {
  if (type === "hogar") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (type === "comercio") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-cyan-50 text-cyan-700 border-cyan-200";
}

function TypeIcon({ type }: { type: Customer["type"] }) {
  if (type === "hogar") return <Home size={14} />;
  if (type === "comercio") return <Store size={14} />;
  return <Building2 size={14} />;
}

export default function CustomerTable({
  items,
  page,
  totalPages,
  total,
  disabled = false,
  onEdit,
  onDelete,
  onPageChange,
}: CustomerTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] table-auto">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Telefonos</th>
              <th className="px-4 py-3">Emails</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
            {items.map((customer) => (
              <tr key={customer.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{customer.name}</p>
                  <p className="text-xs text-slate-500">{customer.address}</p>
                </td>
                <td className="px-4 py-3 font-medium">{customer.taxId}</td>
                <td className="px-4 py-3">{customer.primaryContact}</td>
                <td className="px-4 py-3">{customer.phones.join(", ")}</td>
                <td className="px-4 py-3">{customer.emails.join(", ")}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${typeClassName(customer.type)}`}
                  >
                    <TypeIcon type={customer.type} />
                    {formatType(customer.type)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      onClick={() => onEdit(customer)}
                      disabled={disabled}
                      icon={<UserPen size={14} />}
                      className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      onClick={() => onDelete(customer)}
                      disabled={disabled}
                      className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                    >
                      Eliminar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <p>
          Mostrando <span className="font-semibold text-slate-800">{items.length}</span> de <span className="font-semibold text-slate-800">{total}</span> clientes
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={disabled || page <= 1}
            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
          >
            Anterior
          </Button>
          <span className="px-2 text-xs font-semibold text-slate-500">
            Pagina {page} de {totalPages}
          </span>
          <Button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={disabled || page >= totalPages}
            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
