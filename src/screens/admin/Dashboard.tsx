import { useState, useEffect } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://ucuenkqcpdibheuyabdb.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjdWVua3FjcGRpYmhldXlhYmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0MDgwMDYsImV4cCI6MjA1NDk4NDAwNn0.O3x0uB9pB0JOJGmfh7-ov8zFANuOoxqNPfz0GJFpT7Y";

async function supabase(table: string, select: string = "*", params: string = "") {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?select=${select}${params}`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );
  if (!res.ok) throw new Error(`${table}: ${res.status}`);
  return res.json();
}

// ─── THEME ────────────────────────────────────────────────────────────────────
const C = {
  bg: "#0D0F12",
  surface: "#14171C",
  surfaceAlt: "#1A1E25",
  border: "#252930",
  borderHover: "#353B45",
  accent: "#2563EB",
  accentLight: "#3B82F6",
  accentDim: "#1E3A6E",
  text: "#E8EBF0",
  textMuted: "#6B7280",
  textDim: "#4B5563",
  green: "#10B981",
  greenDim: "#064E3B",
  amber: "#F59E0B",
  amberDim: "#451A03",
  red: "#EF4444",
  redDim: "#450A0A",
  blue: "#3B82F6",
  blueDim: "#1E3A6E",
  gray: "#6B7280",
  grayDim: "#1F2937",
  purple: "#8B5CF6",
  purpleDim: "#3F1F7C",
  cyan: "#06B6D4",
  cyanDim: "#0A3A40",
};

// ─── UTILITIES ────────────────────────────────────────────────────────────────
function countBy(arr: any[], key: string): Record<string, number> {
  return arr.reduce((acc: Record<string, number>, item: any) => {
    const k = item[key] ?? "N/A";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

function sumBy(arr: any[], key: string): number {
  return arr.reduce((sum: number, item: any) => sum + (parseFloat(item[key]) || 0), 0);
}

function fmt(n: number | string, decimals: number = 0): string {
  return Number(n || 0).toLocaleString("es-DO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, gap: 10, color: C.textMuted, fontSize: 13 }}>
      <svg width="18" height="18" viewBox="0 0 18 18" style={{ animation: "spin 0.8s linear infinite" }}>
        <circle cx="9" cy="9" r="7" fill="none" stroke={C.border} strokeWidth="2" />
        <path d="M9 2a7 7 0 0 1 7 7" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" />
      </svg>
      Cargando...
    </div>
  );
}

function StatCard({ label, value, accent, sub }: { label: string; value: string | number; accent?: string; sub?: string }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      padding: "16px 20px",
      borderLeft: accent ? `3px solid ${accent}` : `1px solid ${C.border}`,
    }}>
      <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: C.text, lineHeight: 1, fontFamily: "'DM Mono', monospace" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ icon, children }: { icon?: string; children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", color: C.text, textTransform: "uppercase", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
      {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      <div style={{ flex: 1 }}>{children}</div>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${C.accent} 0%, transparent 100%)` }} />
    </div>
  );
}

function BarChart({
  title,
  data,
  color = C.accent,
  horizontal = false,
  formatValue,
}: {
  title?: string;
  data: Array<{ label: string; value: number; color?: string }>;
  color?: string;
  horizontal?: boolean;
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d: any) => d.value), 1);

  if (horizontal) {
    return (
      <div>
        {title && <SectionTitle>{title}</SectionTitle>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.map((d: any, i: number) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 120, fontSize: 11, color: C.textMuted, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {d.label}
              </div>
              <div style={{ flex: 1, background: C.surfaceAlt, borderRadius: 4, height: 28, position: "relative", overflow: "hidden" }}>
                <div style={{
                  position: "absolute", left: 0, top: 0, bottom: 0,
                  width: `${(d.value / max) * 100}%`,
                  background: d.color || color,
                  borderRadius: 4,
                  transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
                }} />
                <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: C.text, fontFamily: "'DM Mono', monospace", fontWeight: 600, zIndex: 1 }}>
                  {formatValue ? formatValue(d.value) : d.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {title && <SectionTitle>{title}</SectionTitle>}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 160, minHeight: 140 }}>
        {data.slice(0, 12).map((d: any, i: number) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 12, color: C.text, fontWeight: 600, fontFamily: "'DM Mono', monospace", minHeight: 16 }}>
              {formatValue ? formatValue(d.value) : d.value}
            </div>
            <div style={{
              width: "100%", background: d.color || color,
              borderRadius: "4px 4px 0 0",
              height: `${(d.value / max) * 120}px`,
              minHeight: d.value > 0 ? 4 : 0,
              transition: "height 0.6s cubic-bezier(0.4,0,0.2,1)",
            }} />
            <div style={{ fontSize: 10, color: C.textMuted, textAlign: "center", lineHeight: 1.3, minHeight: 24, overflow: "hidden", textOverflow: "ellipsis" }}>
              {d.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const [
          tickets,
          customers,
          devices,
          device_inventory,
          technical_visits,
          site_surveys,
          brands,
          device_types,
          suppliers,
          automation_kits,
        ] = await Promise.all([
          supabase("tickets", "id,status,sla_type,category_id,customer_id,created_at"),
          supabase("customers", "user_id,type,created_at"),
          supabase("devices", "id,name,brand_id,device_type_id,price,created_at"),
          supabase("device_inventory", "device_id,quantity,status"),
          supabase("technical_visits", "id,status,scheduled_start,created_at"),
          supabase("site_surveys", "id,status,created_at"),
          supabase("brands", "id,name"),
          supabase("device_types", "id,name"),
          supabase("suppliers", "id,name,created_at"),
          supabase("automation_kits", "id,name,discount_percent,created_at"),
        ]);

        setData({
          tickets,
          customers,
          devices,
          device_inventory,
          technical_visits,
          site_surveys,
          brands,
          device_types,
          suppliers,
          automation_kits,
        });

        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spinner />;
  if (error)
    return (
      <div style={{ padding: 28, color: C.red, fontSize: 14 }}>
        Error: {error}
      </div>
    );

  const {
    tickets = [],
    customers = [],
    devices = [],
    device_inventory = [],
    technical_visits = [],
    site_surveys = [],
    brands = [],
    device_types = [],
    automation_kits = [],
  } = data;

  // Datos procesados
  const ticketsByStatus = Object.entries(countBy(tickets, "status")).map(([k, v]) => ({
    label: k.charAt(0).toUpperCase() + k.slice(1),
    value: v,
    color: { abierto: C.amber, en_proceso: C.blue, resuelto: C.green, cerrado: C.gray, esperando_cliente: C.textMuted }[k as string] || C.gray,
  }));

  const ticketsBySLA = Object.entries(countBy(tickets, "sla_type"))
    .filter(([k]) => k !== "N/A")
    .map(([k, v]) => ({
      label: k,
      value: v,
      color: { urgente: C.red, "24h": C.amber, "48h": C.blue }[k as string] || C.gray,
    }));

  const customersByType = Object.entries(countBy(customers, "type")).map(([k, v]) => ({
    label: k === "N/A" ? "Sin especificar" : k.charAt(0).toUpperCase() + k.slice(1),
    value: v,
    color: { hogar: C.blue, comercio: C.amber, empresa: C.green }[k as string] || C.gray,
  }));

  const visitsByStatus = Object.entries(countBy(technical_visits, "status")).map(([k, v]) => ({
    label: k.charAt(0).toUpperCase() + k.slice(1),
    value: v,
    color: { programada: C.blue, completada: C.green, cancelada: C.red }[k as string] || C.gray,
  }));

  const surveysByStatus = Object.entries(countBy(site_surveys, "status")).map(([k, v]) => ({
    label: k.charAt(0).toUpperCase() + k.slice(1),
    value: v,
    color: { pendiente: C.amber, en_progreso: C.blue, completado: C.green }[k as string] || C.gray,
  }));

  const devicesByBrand = brands
    .map((b: any) => ({
      label: b.name,
      value: devices.filter((d: any) => d.brand_id === b.id).length,
      color: C.accent,
    }))
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 10);

  const devicesByType = device_types
    .map((t: any) => ({
      label: t.name,
      value: devices.filter((d: any) => d.device_type_id === t.id).length,
      color: C.accent,
    }))
    .sort((a: any, b: any) => b.value - a.value);

  const inventoryByDevice = devices
    .map((d: any) => {
      const inv = device_inventory.find((i: any) => i.device_id === d.id);
      return {
        label: d.name.slice(0, 18),
        value: inv?.quantity || 0,
        color: C.green,
      };
    })
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 10);

  const kitsByDiscount = automation_kits
    .map((k: any) => ({
      label: k.name.slice(0, 20),
      value: k.discount_percent || 0,
      color: C.purple,
    }))
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 8);

  // Estadísticas clave
  const openTickets = tickets.filter((t: any) => !["resuelto", "cerrado"].includes(t.status)).length;
  const urgentTickets = tickets.filter((t: any) => t.sla_type === "urgente").length;
  const completedSurveys = site_surveys.filter((s: any) => s.status === "completado").length;
  const scheduledVisits = technical_visits.filter((v: any) => v.status === "programada").length;
  const totalInventory = sumBy(device_inventory, "quantity");
  const totalInventoryValue = devices.reduce((sum: number, d: any) => {
    const inv = device_inventory.find((i: any) => i.device_id === d.id);
    return sum + ((inv?.quantity || 0) * (d.price || 0));
  }, 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'IBM Plex Sans', sans-serif", color: C.text }}>
        {/* Header */}
        <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 58 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.accent, boxShadow: `0 0 8px ${C.accent}` }} />
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.02em" }}>SmartOps</span>
            <span style={{ color: C.border, fontSize: 20, fontWeight: 100 }}>|</span>
            <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 400 }}>Dashboard de reportes</span>
          </div>
          <span style={{ fontSize: 11, color: C.textMuted }}>
            {new Date().toLocaleDateString("es-DO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>

        {/* Content */}
        <div style={{ padding: 28, maxWidth: 1600, margin: "0 auto" }}>
          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 32 }}>
            <StatCard label="Tickets abiertos" value={openTickets} accent={C.amber} />
            <StatCard label="Tickets urgentes" value={urgentTickets} accent={C.red} />
            <StatCard label="Levantamientos completados" value={completedSurveys} accent={C.green} />
            <StatCard label="Visitas programadas" value={scheduledVisits} accent={C.blue} />
            <StatCard label="Stock total (unidades)" value={totalInventory} accent={C.green} />
            <StatCard label="Valor inventario" value={`$${fmt(totalInventoryValue)}`} accent={C.cyan} sub={`${devices.length} dispositivos`} />
            <StatCard label="Clientes registrados" value={customers.length} accent={C.purple} />
            <StatCard label="Kits de automatización" value={automation_kits.length} accent={C.amber} />
          </div>

          {/* Gráficos principales */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
            {/* Tickets por estado */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
              <BarChart
                title="📊 Tickets por estado"
                data={ticketsByStatus}
                horizontal={true}
              />
            </div>

            {/* Tickets por SLA */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
              <BarChart
                title="⚡ Tickets por SLA"
                data={ticketsBySLA}
                horizontal={true}
              />
            </div>

            {/* Clientes por tipo */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
              <BarChart
                title="👥 Clientes por tipo"
                data={customersByType}
                horizontal={true}
              />
            </div>

            {/* Visitas por estado */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
              <BarChart
                title="🚗 Visitas técnicas"
                data={visitsByStatus}
                horizontal={true}
              />
            </div>
          </div>

          {/* Gráficos de dispositivos */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
            {/* Dispositivos por marca */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
              <BarChart
                title="🏷️ Top 10 marcas"
                data={devicesByBrand.length > 0 ? devicesByBrand : [{ label: "Sin datos", value: 0, color: C.gray }]}
                color={C.accentLight}
              />
            </div>

            {/* Dispositivos por tipo */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
              <BarChart
                title="🔧 Dispositivos por tipo"
                data={devicesByType.length > 0 ? devicesByType : [{ label: "Sin datos", value: 0, color: C.gray }]}
                color={C.accentLight}
              />
            </div>
          </div>

          {/* Inventario */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
            {/* Top inventario */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
              <BarChart
                title="📦 Stock por dispositivo (Top 10)"
                data={inventoryByDevice.length > 0 ? inventoryByDevice : [{ label: "Sin datos", value: 0, color: C.gray }]}
              />
            </div>

            {/* Kits por descuento */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
              <BarChart
                title="🎁 Kits por descuento"
                data={kitsByDiscount.length > 0 ? kitsByDiscount : [{ label: "Sin datos", value: 0, color: C.gray }]}
                formatValue={(v) => `${v}%`}
              />
            </div>
          </div>

          {/* Levantamientos */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
            <BarChart
              title="📋 Levantamientos por estado"
              data={surveysByStatus.length > 0 ? surveysByStatus : [{ label: "Sin datos", value: 0, color: C.gray }]}
              horizontal={true}
            />
          </div>
        </div>
      </div>
    </>
  );
}
