import { Filter, Plus, Search } from "lucide-react";
import Button from "../Button";
import Input from "../Input";
import type { Role } from "../../types/Role";

interface UserFiltersProps {
  search: string;
  roleId: string | "all";
  roles: Role[];
  onSearchChange: (value: string) => void;
  onRoleChange: (value: string | "all") => void;
  onCreate: () => void;
  disabled?: boolean;
  canCreate?: boolean;
}

export default function UserFilters({
  search,
  roleId,
  roles,
  onSearchChange,
  onRoleChange,
  onCreate,
  disabled = false,
  canCreate = false,
}: UserFiltersProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Filter size={15} />
        Filtros de usuarios
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_240px_auto]">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por nombre, cedula o rol"
          icon={<Search size={16} />}
          disabled={disabled}
        />

        <select
          value={roleId}
          onChange={(event) => onRoleChange(event.target.value as string | "all")}
          disabled={disabled}
          className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">Todos los roles</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>

        <Button
          type="button"
          onClick={onCreate}
          disabled={disabled || !canCreate}
          icon={<Plus size={16} />}
          className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
        >
          Nuevo usuario
        </Button>
      </div>
    </div>
  );
}
