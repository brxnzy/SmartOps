import { Filter, Plus, Search } from "lucide-react";
import Button from "../components/Button";
import Input from "../components/Input";
import type { CustomerFiltersProps } from "../types/interfaces";
import type { CustomerType } from "../types/customer.types";

export default function CustomerFilters({
  search,
  type,
  onSearchChange,
  onTypeChange,
  onCreate,
  disabled = false,
}: CustomerFiltersProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Filter size={15} />
        Filtros de clientes
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por nombre, documento o contacto"
          icon={<Search size={16} />}
          disabled={disabled}
        />

        <select
          value={type}
          onChange={(event) => onTypeChange(event.target.value as CustomerType | "all")}
          disabled={disabled}
          className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">Todos los tipos</option>
          <option value="hogar">Hogar</option>
          <option value="comercio">Comercio</option>
          <option value="empresa">Empresa</option>
        </select>

        <Button
          type="button"
          onClick={onCreate}
          disabled={disabled}
          icon={<Plus size={16} />}
          className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
        >
          Nuevo cliente
        </Button>
      </div>
    </div>
  );
}
