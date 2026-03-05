import { useMemo, useState } from "react";
import {
  Activity,
  CircleOff,
  Cpu,
  Plus,
  Search,
  Settings,
  Trash2,
  Wifi,
  Wrench,
} from "lucide-react";

type DeviceStatus = "online" | "offline" | "maintenance";

type Device = {
  id: string;
  name: string;
  type: string;
  room: string;
  serial: string;
  firmware: string;
  status: DeviceStatus;
  installedAt: string;
  lastSeen: string;
};

type DeviceForm = Omit<Device, "id">;

const INITIAL_DEVICES: Device[] = [
  {
    id: "dev-1",
    name: "Panel Principal",
    type: "Control Hub",
    room: "Sala",
    serial: "SMOP-HUB-1209",
    firmware: "v2.3.1",
    status: "online",
    installedAt: "2025-11-14",
    lastSeen: "Hace 2 min",
  },
  {
    id: "dev-2",
    name: "Sensor Pasillo",
    type: "Motion Sensor",
    room: "Pasillo",
    serial: "SMOP-MOT-9822",
    firmware: "v1.9.0",
    status: "maintenance",
    installedAt: "2025-09-02",
    lastSeen: "Hace 1 h",
  },
  {
    id: "dev-3",
    name: "Camara Patio",
    type: "Security Camera",
    room: "Patio",
    serial: "SMOP-CAM-7701",
    firmware: "v3.0.4",
    status: "offline",
    installedAt: "2025-10-20",
    lastSeen: "Hace 1 dia",
  },
];

const DEFAULT_FORM: DeviceForm = {
  name: "",
  type: "",
  room: "",
  serial: "",
  firmware: "",
  status: "online",
  installedAt: "",
  lastSeen: "Hace unos segundos",
};

const statusClasses: Record<DeviceStatus, string> = {
  online: "bg-emerald-50 text-emerald-700 border-emerald-200",
  offline: "bg-slate-100 text-slate-700 border-slate-200",
  maintenance: "bg-amber-50 text-amber-700 border-amber-200",
};

const statusLabel: Record<DeviceStatus, string> = {
  online: "Online",
  offline: "Offline",
  maintenance: "Mantenimiento",
};

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>(INITIAL_DEVICES);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | DeviceStatus>("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [formData, setFormData] = useState<DeviceForm>(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState("");

  const deviceTypes = useMemo(
    () => Array.from(new Set(devices.map((device) => device.type))).sort(),
    [devices]
  );

  const filteredDevices = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return devices.filter((device) => {
      const matchesSearch =
        device.name.toLowerCase().includes(normalizedQuery) ||
        device.serial.toLowerCase().includes(normalizedQuery) ||
        device.room.toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === "all" || device.status === statusFilter;
      const matchesType = typeFilter === "all" || device.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [devices, searchTerm, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const online = devices.filter((device) => device.status === "online").length;
    const offline = devices.filter((device) => device.status === "offline").length;
    const maintenance = devices.filter((device) => device.status === "maintenance").length;

    return {
      total: devices.length,
      online,
      offline,
      maintenance,
    };
  }, [devices]);

  const openCreateModal = () => {
    setEditingId(null);
    setError("");
    setFormData(DEFAULT_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (device: Device) => {
    setEditingId(device.id);
    setError("");
    setFormData({
      name: device.name,
      type: device.type,
      room: device.room,
      serial: device.serial,
      firmware: device.firmware,
      status: device.status,
      installedAt: device.installedAt,
      lastSeen: device.lastSeen,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setError("");
    setFormData(DEFAULT_FORM);
  };

  const updateForm = (key: keyof DeviceForm, value: string) => {
    setFormData((previous) => ({ ...previous, [key]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim() || !formData.type.trim() || !formData.room.trim() || !formData.serial.trim()) {
      setError("Nombre, tipo, zona y serial son campos obligatorios.");
      return false;
    }

    return true;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    if (editingId) {
      setDevices((previous) =>
        previous.map((device) =>
          device.id === editingId ? { ...device, ...formData, lastSeen: "Actualizado hace segundos" } : device
        )
      );
      closeModal();
      return;
    }

    const newDevice: Device = {
      id: crypto.randomUUID(),
      ...formData,
      lastSeen: "Creado hace segundos",
    };

    setDevices((previous) => [newDevice, ...previous]);
    closeModal();
  };

  const handleDelete = (deviceId: string) => {
    const shouldDelete = window.confirm("Deseas eliminar este dispositivo?");
    if (!shouldDelete) return;

    setDevices((previous) => previous.filter((device) => device.id !== deviceId));
  };

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 p-5 text-white shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              <Activity className="h-3.5 w-3.5" />
              Control de IoT
            </p>
            <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">Dispositivos</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-200 sm:text-base">
              Administra tu inventario de equipos domoticos: crea registros, actualiza firmware, monitorea estados y
              elimina dispositivos fuera de servicio.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Nuevo dispositivo
          </button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total</p>
          <p className="mt-1 text-2xl font-semibold text-slate-800">{stats.total}</p>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
            <Wifi className="h-4 w-4" />
            Online
          </p>
          <p className="mt-1 text-2xl font-semibold text-emerald-800">{stats.online}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <CircleOff className="h-4 w-4" />
            Offline
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-800">{stats.offline}</p>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="flex items-center gap-1.5 text-sm font-medium text-amber-700">
            <Wrench className="h-4 w-4" />
            Mantenimiento
          </p>
          <p className="mt-1 text-2xl font-semibold text-amber-800">{stats.maintenance}</p>
        </article>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 lg:grid-cols-3">
          <label className="relative lg:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por nombre, serial o zona"
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | DeviceStatus)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">Todos los estados</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="maintenance">Mantenimiento</option>
          </select>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">Todos los tipos</option>
            {deviceTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="space-y-4">
        <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-semibold">Dispositivo</th>
                <th className="px-4 py-3 font-semibold">Zona</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Firmware</th>
                <th className="px-4 py-3 font-semibold">Instalado</th>
                <th className="px-4 py-3 font-semibold">Ultima actividad</th>
                <th className="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDevices.length > 0 ? (
                filteredDevices.map((device) => (
                  <tr key={device.id} className="text-sm text-slate-700">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{device.name}</p>
                      <p className="text-xs text-slate-500">{device.serial}</p>
                    </td>
                    <td className="px-4 py-3">{device.room}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[device.status]}`}
                      >
                        {statusLabel[device.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">{device.firmware || "No definido"}</td>
                    <td className="px-4 py-3">{device.installedAt || "Sin fecha"}</td>
                    <td className="px-4 py-3">{device.lastSeen || "Sin datos"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(device)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <Settings className="h-3.5 w-3.5" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(device.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    No hay dispositivos que coincidan con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 md:hidden">
          {filteredDevices.length > 0 ? (
            filteredDevices.map((device) => (
              <article key={device.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-800">{device.name}</h3>
                    <p className="text-xs text-slate-500">{device.serial}</p>
                  </div>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[device.status]}`}
                  >
                    {statusLabel[device.status]}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Zona</dt>
                    <dd className="font-medium text-slate-700">{device.room}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Tipo</dt>
                    <dd className="font-medium text-slate-700">{device.type}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Firmware</dt>
                    <dd className="font-medium text-slate-700">{device.firmware || "No definido"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Instalado</dt>
                    <dd className="font-medium text-slate-700">{device.installedAt || "Sin fecha"}</dd>
                  </div>
                </dl>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(device)}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(device.id)}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar
                  </button>
                </div>
              </article>
            ))
          ) : (
            <article className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              No hay dispositivos que coincidan con los filtros aplicados.
            </article>
          )}
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
          <div className="w-full rounded-t-2xl border border-slate-200 bg-white p-4 shadow-xl sm:max-w-2xl sm:rounded-2xl sm:p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{editingId ? "Actualizar dispositivo" : "Nuevo registro"}</p>
                <h2 className="text-xl font-semibold text-slate-800">
                  {editingId ? "Editar dispositivo" : "Crear dispositivo"}
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-600">Nombre</span>
                  <input
                    value={formData.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    placeholder="Ej: Sensor Entrada"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-600">Tipo</span>
                  <input
                    value={formData.type}
                    onChange={(event) => updateForm("type", event.target.value)}
                    placeholder="Ej: Smart Lock"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-600">Zona</span>
                  <input
                    value={formData.room}
                    onChange={(event) => updateForm("room", event.target.value)}
                    placeholder="Ej: Recepcion"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-600">Serial</span>
                  <input
                    value={formData.serial}
                    onChange={(event) => updateForm("serial", event.target.value)}
                    placeholder="Ej: SMOP-12345"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-600">Firmware</span>
                  <input
                    value={formData.firmware}
                    onChange={(event) => updateForm("firmware", event.target.value)}
                    placeholder="v1.0.0"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-600">Estado</span>
                  <select
                    value={formData.status}
                    onChange={(event) => updateForm("status", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="maintenance">Mantenimiento</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-600">Fecha instalacion</span>
                  <input
                    type="date"
                    value={formData.installedAt}
                    onChange={(event) => updateForm("installedAt", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>

              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
                >
                  <Cpu className="h-4 w-4" />
                  {editingId ? "Guardar cambios" : "Crear dispositivo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
