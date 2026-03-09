import { BadgeCheck, UserCog } from "lucide-react";
import Button from "./Button";
import type { CompanyUser } from "../types/userManagement.types";

interface UserTableProps {
  items: CompanyUser[];
  currentUserId?: string;
  page: number;
  totalPages: number;
  total: number;
  disabled?: boolean;
  canUpdate?: boolean;
  canDisable?: boolean;
  onEdit: (user: CompanyUser) => void;
  onDisable: (user: CompanyUser) => void;
  onPageChange: (page: number) => void;
}

export default function UserTable({
  items,
  currentUserId,
  page,
  totalPages,
  total,
  disabled = false,
  canUpdate = false,
  canDisable = false,
  onEdit,
  onDisable,
  onPageChange,
}: UserTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-200 table-auto">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Cedula</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
            {items.map((user) => {
              const isSelf = currentUserId === user.id;

              return (
                <tr key={user.userRoleId} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">{new Date(user.createdAt).toLocaleDateString()}</p>
                  </td>
                  <td className="px-4 py-3">{user.idCard ?? "N/A"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      <BadgeCheck size={14} />
                      {user.roleName}
                    </span>
                    {user.isDisabled && (
                      <span className="ml-2 inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                        Deshabilitado
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isSelf ? (
                      <div className="text-right text-xs font-medium text-slate-400">Sin acciones</div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        {canUpdate && (
                          <Button
                            type="button"
                            onClick={() => onEdit(user)}
                            disabled={disabled}
                            icon={<UserCog size={14} />}
                            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                          >
                            Editar rol
                          </Button>
                        )}

                        {canDisable && (
                          <Button
                            type="button"
                            onClick={() => onDisable(user)}
                            disabled={disabled}
                            className={
                              user.isDisabled
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                            }
                          >
                            {user.isDisabled ? "Habilitar" : "Deshabilitar"}
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <p>
          Mostrando <span className="font-semibold text-slate-800">{items.length}</span> de <span className="font-semibold text-slate-800">{total}</span> usuarios
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
