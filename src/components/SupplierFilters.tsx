import { Filter, Plus, Search } from "lucide-react";
import Button from "../components/Button";
import Input from "../components/Input";
import type { SupplierFiltersProps } from "../types/interfaces";

export default function SupplierFilters({
  search,
  onSearchChange,
  onCreate,
  disabled = false,
}: SupplierFiltersProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Filter size={15} />
        Filtros de proveedores
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por nombre, email o telefono"
          icon={<Search size={16} />}
          disabled={disabled}
        />

        <Button
          type="button"
          onClick={onCreate}
          disabled={disabled}
          icon={<Plus size={16} />}
          className="border-amber-600 bg-amber-600 text-white hover:bg-amber-700"
        >
          Nuevo proveedor
        </Button>
      </div>
    </div>
  );
}
