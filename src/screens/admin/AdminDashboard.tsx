import { useEffect, useMemo, useState } from "react";
import { Boxes, CalendarClock, ClipboardList, Users } from "lucide-react";
import { supabase } from "../../libs/supabase";

type DashboardData = {
  customers: Array<Record<string, unknown>>;
  devices: Array<Record<string, unknown>>;
  deviceInventory: Array<Record<string, unknown>>;
  technicalVisits: Array<Record<string, unknown>>;
  siteSurveys: Array<Record<string, unknown>>;
  automationKits: Array<Record<string, unknown>>;
};

const EMPTY_DATA: DashboardData = {
  customers: [],
  devices: [],
  deviceInventory: [],
  technicalVisits: [],
  siteSurveys: [],
  automationKits: [],
};

async function fetchTable(table: string, select = "*") {
  const { data, error } = await supabase.from(table).select(select);
  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
  return ((data ?? []) as unknown) as Array<Record<string, unknown>>;
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function formatAmount(value: number): string {
  return value.toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function countBy<T extends Record<string, unknown>>(items: T[], key: keyof T) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const raw = item[key];
    const label = typeof raw === "string" && raw.trim() ? raw : "sin_dato";
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});
}

function StatCard({
  title,
  value,
  helper,
  icon,
}: {
  title: string;
  value: string | number;
  helper?: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          {helper ? <p className="mt-2 text-sm text-slate-500">{helper}</p> : null}
        </div>
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">{icon}</div>
      </div>
    </article>
  );
}

function SummaryList({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: number }>;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No hay datos disponibles.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-700">{item.label}</span>
              <span className="text-sm font-semibold text-slate-900">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          customers,
          devices,
          deviceInventory,
          technicalVisits,
          siteSurveys,
          automationKits,
        ] = await Promise.all([
          fetchTable("customers", "user_id,type,created_at"),
          fetchTable("devices", "id,name,brand_id,device_type_id,price,created_at"),
          fetchTable("device_inventory", "device_id,quantity,status"),
          fetchTable("technical_visits", "id,status,scheduled_start,created_at"),
          fetchTable("site_surveys", "id,status,created_at,completed_at"),
          fetchTable("kits", "id,name,price,created_at"),
        ]);

        if (!active) return;

        setData({
          customers,
          devices,
          deviceInventory,
          technicalVisits,
          siteSurveys,
          automationKits,
        });
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "No se pudo cargar el dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const completedSurveys = data.siteSurveys.filter((survey) => {
      const status = typeof survey.status === "string" ? survey.status : "";
      return status === "completado" || Boolean(survey.completed_at);
    }).length;
    const scheduledVisits = data.technicalVisits.filter((visit) => visit.status === "programada").length;
    const totalInventoryUnits = data.deviceInventory.reduce((sum, item) => sum + asNumber(item.quantity), 0);
    const totalInventoryValue = data.devices.reduce((sum, device) => {
      const inventory = data.deviceInventory.find((item) => item.device_id === device.id);
      return sum + asNumber(inventory?.quantity) * asNumber(device.price);
    }, 0);

    return {
      completedSurveys,
      scheduledVisits,
      totalInventoryUnits,
      totalInventoryValue,
    };
  }, [data]);

  const customerTypeList = useMemo(
    () =>
      Object.entries(countBy(data.customers, "type"))
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
    [data.customers]
  );

  const surveyStatusList = useMemo(
    () =>
      Object.entries(countBy(data.siteSurveys, "status"))
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
    [data.siteSurveys]
  );

  const visitStatusList = useMemo(
    () =>
      Object.entries(countBy(data.technicalVisits, "status"))
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
    [data.technicalVisits]
  );

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
        Cargando dashboard...
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700 shadow-sm">
        {error}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-2 text-sm text-slate-500">Vista general con métricas principales operativas.</p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Clientes" value={data.customers.length} helper="Registros encontrados" icon={<Users size={20} />} />
        <StatCard title="Levantamientos completados" value={stats.completedSurveys} helper="Finalizados correctamente" icon={<ClipboardList size={20} />} />
        <StatCard title="Visitas programadas" value={stats.scheduledVisits} helper="Pendientes en agenda" icon={<CalendarClock size={20} />} />
        <StatCard
          title="Inventario"
          value={stats.totalInventoryUnits}
          helper={`Valor estimado ${formatAmount(stats.totalInventoryValue)}`}
          icon={<Boxes size={20} />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SummaryList title="Clientes por tipo" items={customerTypeList} />
        <SummaryList title="Levantamientos por estado" items={surveyStatusList} />
        <SummaryList title="Visitas por estado" items={visitStatusList} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Resumen rápido</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Dispositivos</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{data.devices.length}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Items de inventario</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{data.deviceInventory.length}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Kits</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{data.automationKits.length}</p>
          </div>
        </div>
      </section>
    </section>
  );
}
