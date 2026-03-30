import { Mail, Phone, UserPen } from "lucide-react";
import Button from "../Button";
import type { SupplierTableProps } from "../../types/interfaces";

export default function SupplierTable({
  items,
  page,
  totalPages,
  total,
  disabled = false,
  onEdit,
  onDelete,
  onPageChange,
}: SupplierTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-245 table-auto">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Telefono</th>
              <th className="px-4 py-3">Direccion</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
            {items.map((supplier) => (
              <tr key={supplier.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{supplier.name}</p>
                  <p className="text-xs text-slate-500">{new Date(supplier.createdAt).toLocaleDateString()}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail size={14} className="text-slate-400" />
                    <span>{supplier.email ?? "N/A"}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone size={14} className="text-slate-400" />
                    <span>{supplier.phone ?? "N/A"}</span>
                  </div>
                </td>
                <td className="px-4 py-3">{supplier.address ?? "N/A"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      onClick={() => onEdit(supplier)}
                      disabled={disabled}
                      icon={<UserPen size={14} />}
                      className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      onClick={() => onDelete(supplier)}
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
          Mostrando <span className="font-semibold text-slate-800">{items.length}</span> de{" "}
          <span className="font-semibold text-slate-800">{total}</span> proveedores
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
