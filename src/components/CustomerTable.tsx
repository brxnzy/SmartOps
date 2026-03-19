import { Building2, Eye, Home, Store, Trash2, UserPen } from "lucide-react";
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
  onViewDetail,
  onPageChange,
}: CustomerTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-245 table-auto">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Cedula</th>
              <th className="px-4 py-3">Telefono</th>
              <th className="px-4 py-3">Tax ID</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
            {items.map((customer) => (
              <tr key={customer.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{customer.name}</p>
                  <p className="text-xs text-slate-500">{new Date(customer.createdAt).toLocaleDateString()}</p>
                </td>
                <td className="px-4 py-3">{customer.idCard ?? "N/A"}</td>
                <td className="px-4 py-3">{customer.phone ?? "N/A"}</td>
                <td className="px-4 py-3 font-medium">{customer.taxId}</td>
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
                      onClick={() => onViewDetail(customer)}
                      disabled={disabled}
                      aria-label="Ver perfil 360"
                      title="Ver perfil 360"
                      icon={<Eye size={14} />}
                      className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    >
                    </Button>
                    <Button
                      type="button"
                      onClick={() => onEdit(customer)}
                      disabled={disabled}
                      aria-label="Editar cliente"
                      title="Editar cliente"
                      icon={<UserPen size={14} />}
                      className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                    >
                    </Button>
                    <Button
                      type="button"
                      onClick={() => onDelete(customer)}
                      disabled={disabled}
                      aria-label="Eliminar cliente"
                      title="Eliminar cliente"
                      icon={<Trash2 size={14} />}
                      className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                    >
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
