import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  ArcElement,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { CircleDollarSign, Download, HardHat, Loader2, RefreshCcw, ShieldAlert, Ticket, Wrench } from "lucide-react";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import Field from "../../components/Field";
import Input from "../../components/Input";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../libs/supabase";
import { PERMISSIONS } from "../../constants/permissions";
import { listInstallationProjects, type InstallationProjectSummary } from "../../services/installation.service";
import { logAuditEvent } from "../../services/audit.service";
import { listPaymentAccounts, listCompanyPaymentTransactions } from "../../services/payments.service";
import { listCompanyTickets } from "../../services/tickets.service";
import type { PaymentAccountSummary, PaymentMethod, PaymentTransaction } from "../../types/payment.types";
import type { TicketListItem } from "../../types/ticketing.types";
import { formatPaymentAmount } from "../../utils/paymentFormatting";
import { downloadPDF } from "../../utils/reportPdf";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

type DashboardInstalledDevice = {
  id: string;
  installedAt: string | null;
  deviceName: string | null;
  deviceModel: string | null;
  siteName: string | null;
  zoneName: string | null;
  status: string | null;
};

function safeText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function safeNullableText(value: unknown): string | null {
  const text = safeText(value, "").trim();
  return text ? text : null;
}

function pickSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function localDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function firstDayOfCurrentMonth(): string {
  const now = new Date();
  return localDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
}

function todayDateInput(): string {
  return localDateInputValue(new Date());
}

function parseDateInputStart(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDateInputEnd(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isWithinRange(value: string | null, from: string, to: string): boolean {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;

  const start = parseDateInputStart(from);
  const end = parseDateInputEnd(to);

  if (start && parsed < start) return false;
  if (end && parsed > end) return false;
  return true;
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat("es-DO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function formatDateOnly(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat("es-DO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(parsed);
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("es-DO", { month: "short" }).format(date);
}

function buildMonthlySeries<T>(
  items: T[],
  selector: (item: T) => string | null,
  valueSelector: (item: T) => number,
  months = 6
) {
  const now = new Date();
  const buckets = Array.from({ length: months }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (months - 1 - index), 1);
    return {
      key: monthKey(date),
      label: monthLabel(date),
      value: 0,
    };
  });

  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  items.forEach((item) => {
    const rawDate = selector(item);
    if (!rawDate) return;
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return;
    const bucket = bucketMap.get(monthKey(parsed));
    if (bucket) {
      bucket.value += valueSelector(item);
    }
  });

  return buckets;
}

function formatMethod(method: PaymentMethod): string {
  if (method === "cash") return "Efectivo";
  if (method === "bank_transfer") return "Transferencia";
  if (method === "card") return "Tarjeta";
  return "Otros";
}

function formatProjectStatus(status: string | null): string {
  if (status === "en_progreso") return "En progreso";
  if (status === "terminado") return "Terminado";
  if (status === "cancelado") return "Cancelado";
  return "Pendiente";
}

function statusPillClass(status: string | null): string {
  if (status === "terminado" || status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "en_progreso" || status === "submitted") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "cancelado" || status === "rejected") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function methodPillClass(method: PaymentMethod): string {
  if (method === "cash") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (method === "bank_transfer") return "border-blue-200 bg-blue-50 text-blue-700";
  if (method === "card") return "border-violet-200 bg-violet-50 text-violet-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function topLineColor(index: number): string {
  const palette = ["#2563eb", "#0f766e", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6"];
  return palette[index % palette.length];
}

async function listInstalledDevices(companyId: string): Promise<DashboardInstalledDevice[]> {
  const { data, error } = await supabase
    .from("installed_devices")
    .select(
      `
      id,
      installed_at,
      status,
      customer_sites:site_id ( name ),
      customer_site_zones:zone_id ( name ),
      devices:catalog_device_id ( name, model )
    `
    )
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("installed_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "No se pudieron cargar los dispositivos instalados.");
  }

  return (data ?? []).map((row) => {
    const site = pickSingle((row as { customer_sites?: unknown }).customer_sites as unknown);
    const zone = pickSingle((row as { customer_site_zones?: unknown }).customer_site_zones as unknown);
    const device = pickSingle((row as { devices?: unknown }).devices as unknown);

    return {
      id: safeText((row as { id?: unknown }).id),
      installedAt: safeText((row as { installed_at?: unknown }).installed_at, ""),
      status: safeNullableText((row as { status?: unknown }).status),
      siteName: typeof site === "object" && site ? safeNullableText((site as { name?: unknown }).name) : null,
      zoneName: typeof zone === "object" && zone ? safeNullableText((zone as { name?: unknown }).name) : null,
      deviceName: typeof device === "object" && device ? safeNullableText((device as { name?: unknown }).name) : null,
      deviceModel: typeof device === "object" && device ? safeNullableText((device as { model?: unknown }).model) : null,
    };
  });
}

function MetricCard({
  label,
  value,
  sublabel,
  icon,
  accentClassName,
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon: ReactNode;
  accentClassName: string;
}) {
  return (
    <article className={`rounded-2xl border bg-white p-4 shadow-sm ${accentClassName}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
          {sublabel ? <p className="mt-1 text-xs text-slate-500">{sublabel}</p> : null}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 text-slate-600">{icon}</div>
      </div>
    </article>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function AdminDashboard() {
  const { companyProfile, canAccess } = useAuth();
  const companyId = companyProfile?.id ?? null;
  const canReadIncomeReport = canAccess(PERMISSIONS.paymentsStatementRead);
  const canDownloadIncomeReport = canAccess(PERMISSIONS.paymentsStatementDownload);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<InstallationProjectSummary[]>([]);
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [accounts, setAccounts] = useState<PaymentAccountSummary[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [installedDevices, setInstalledDevices] = useState<DashboardInstalledDevice[]>([]);
  const [rangeFrom, setRangeFrom] = useState(firstDayOfCurrentMonth());
  const [rangeTo, setRangeTo] = useState(todayDateInput());

  const loadDashboard = useCallback(async () => {
    if (!companyId) {
      setProjects([]);
      setTickets([]);
      setAccounts([]);
      setTransactions([]);
      setInstalledDevices([]);
      setLoading(false);
      setError("No se encontro la compania activa.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [projectRows, ticketRows, accountRows, transactionRows, deviceRows] = await Promise.all([
        listInstallationProjects(companyId),
        listCompanyTickets(companyId),
        listPaymentAccounts(companyId),
        listCompanyPaymentTransactions(companyId),
        listInstalledDevices(companyId),
      ]);

      setProjects(projectRows);
      setTickets(ticketRows);
      setAccounts(accountRows);
      setTransactions(transactionRows);
      setInstalledDevices(deviceRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el dashboard.");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const openTickets = useMemo(
    () => tickets.filter((ticket) => !["resuelto", "cerrado"].includes(ticket.status)),
    [tickets]
  );

  const openTicketsByPriority = useMemo(() => {
    const counts = {
      urgente: 0,
      "24h": 0,
      "48h": 0,
    };

    openTickets.forEach((ticket) => {
      counts[ticket.slaType] += 1;
    });

    return counts;
  }, [openTickets]);

  const projectsInProgress = useMemo(
    () => projects.filter((project) => project.status === "en_progreso"),
    [projects]
  );

  const pendingAccounts = useMemo(
    () => accounts.filter((account) => account.amountPending > 0),
    [accounts]
  );

  const approvedTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) => transaction.status === "approved" && typeof transaction.amount === "number" && transaction.amount > 0
      ),
    [transactions]
  );

  const currentMonthIncome = useMemo(() => {
    const now = new Date();
    return approvedTransactions.reduce((sum, transaction) => {
      const approvedAt = transaction.approvedAt ?? transaction.submittedAt;
      if (!approvedAt) return sum;
      const parsed = new Date(approvedAt);
      if (Number.isNaN(parsed.getTime())) return sum;
      if (parsed.getFullYear() !== now.getFullYear() || parsed.getMonth() !== now.getMonth()) return sum;
      return sum + (transaction.amount ?? 0);
    }, 0);
  }, [approvedTransactions]);

  const selectedRangeTransactions = useMemo(() => {
    return approvedTransactions.filter((transaction) => {
      const paymentDate = transaction.approvedAt ?? transaction.submittedAt;
      if (!isWithinRange(paymentDate, rangeFrom, rangeTo)) return false;
      return true;
    });
  }, [approvedTransactions, rangeFrom, rangeTo]);

  const selectedRangeIncome = useMemo(
    () => selectedRangeTransactions.reduce((sum, transaction) => sum + (transaction.amount ?? 0), 0),
    [selectedRangeTransactions]
  );

  const selectedRangeIncomeByMethod = useMemo(() => {
    const totals: Record<PaymentMethod, number> = {
      cash: 0,
      bank_transfer: 0,
      card: 0,
      other: 0,
    };

    selectedRangeTransactions.forEach((transaction) => {
      totals[transaction.method] += transaction.amount ?? 0;
    });

    return totals;
  }, [selectedRangeTransactions]);

  const selectedRangeDevices = useMemo(
    () => installedDevices.filter((device) => isWithinRange(device.installedAt, rangeFrom, rangeTo)),
    [installedDevices, rangeFrom, rangeTo]
  );

  const devicesLastSixMonths = useMemo(
    () => buildMonthlySeries(installedDevices, (item) => item.installedAt, () => 1, 6),
    [installedDevices]
  );

  const incomeLastSixMonths = useMemo(
    () => buildMonthlySeries(approvedTransactions, (item) => item.approvedAt ?? item.submittedAt, (item) => item.amount ?? 0, 6),
    [approvedTransactions]
  );

  const projectsByStatus = useMemo(() => {
    const counts = projects.reduce(
      (acc, project) => {
        if (project.status === "en_progreso") acc.en_progreso += 1;
        else if (project.status === "terminado") acc.terminado += 1;
        else if (project.status === "cancelado") acc.cancelado += 1;
        else acc.pendiente += 1;
        return acc;
      },
      { pendiente: 0, en_progreso: 0, terminado: 0, cancelado: 0 }
    );

    return [
      { label: "Pendientes", value: counts.pendiente },
      { label: "En progreso", value: counts.en_progreso },
      { label: "Terminados", value: counts.terminado },
      { label: "Cancelados", value: counts.cancelado },
    ];
  }, [projects]);

  const ticketPriorityChart = useMemo(
    () => ({
      labels: ["Urgente", "24h", "48h"],
      datasets: [
        {
          data: [openTicketsByPriority.urgente, openTicketsByPriority["24h"], openTicketsByPriority["48h"]],
          backgroundColor: ["#dc2626", "#f59e0b", "#2563eb"],
          borderColor: ["#fee2e2", "#fef3c7", "#dbeafe"],
          borderWidth: 1,
        },
      ],
    }),
    [openTicketsByPriority]
  );

  const incomeLineChart = useMemo(
    () => ({
      labels: incomeLastSixMonths.map((bucket) => bucket.label),
      datasets: [
        {
          label: "Ingresos",
          data: incomeLastSixMonths.map((bucket) => bucket.value),
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.12)",
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: "#2563eb",
        },
      ],
    }),
    [incomeLastSixMonths]
  );

  const devicesBarChart = useMemo(
    () => ({
      labels: devicesLastSixMonths.map((bucket) => bucket.label),
      datasets: [
        {
          label: "Instalados",
          data: devicesLastSixMonths.map((bucket) => bucket.value),
          backgroundColor: devicesLastSixMonths.map((_, index) => topLineColor(index)),
          borderRadius: 8,
        },
      ],
    }),
    [devicesLastSixMonths]
  );

  const projectStatusChart = useMemo(
    () => ({
      labels: projectsByStatus.map((item) => item.label),
      datasets: [
        {
          label: "Proyectos",
          data: projectsByStatus.map((item) => item.value),
          backgroundColor: ["#94a3b8", "#2563eb", "#10b981", "#ef4444"],
          borderRadius: 8,
        },
      ],
    }),
    [projectsByStatus]
  );

  const incomeMethodChart = useMemo(
    () => ({
      labels: ["Efectivo", "Transferencia"],
      datasets: [
        {
          data: [selectedRangeIncomeByMethod.cash, selectedRangeIncomeByMethod.bank_transfer],
          backgroundColor: ["#10b981", "#2563eb"],
          borderColor: ["#d1fae5", "#dbeafe"],
          borderWidth: 1,
        },
      ],
    }),
    [selectedRangeIncomeByMethod]
  );

  const incomeReportRows = useMemo(
    () =>
      selectedRangeTransactions.map((transaction) => ({
        paymentDate: transaction.approvedAt ?? transaction.submittedAt ?? "",
        customerName: transaction.customerName ?? "Cliente",
        siteName: transaction.siteName ?? "-",
        method: formatMethod(transaction.method),
        amount: transaction.amount ?? 0,
        invoiceNumber: transaction.invoiceNumber ?? "-",
        reference: transaction.reference ?? "-",
      })),
    [selectedRangeTransactions]
  );

  const isIncomeRangeValid = rangeFrom <= rangeTo;

  const downloadIncomeReport = () => {
    if (!isIncomeRangeValid || !canDownloadIncomeReport) return;
    void logAuditEvent({
      action: "download",
      entity: "payment_statements",
      companyId,
      newValues: {
        rangeFrom,
        rangeTo,
        transactionCount: selectedRangeTransactions.length,
        totalAmount: selectedRangeIncome,
      },
    });
    downloadPDF(
      incomeReportRows,
      `reporte_ingresos_${rangeFrom}_${rangeTo}.pdf`,
      ["paymentDate", "customerName", "siteName", "method", "amount", "invoiceNumber", "reference"],
      companyProfile?.name ?? "SmartOps",
      "Reporte de ingresos",
      {
        subtitle: `Rango ${formatDateOnly(rangeFrom)} - ${formatDateOnly(rangeTo)}`,
        summary: [
          { label: "Total en rango", value: formatPaymentAmount(selectedRangeIncome) },
          { label: "Transacciones", value: String(selectedRangeTransactions.length) },
        ],
        companyLogoUrl: companyProfile?.logoUrl ?? null,
      }
    );
  };

  if (loading) {
    return (
      <section className="grid gap-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando dashboard operativo...
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="h-56 rounded-3xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-56 rounded-3xl border border-slate-200 bg-white shadow-sm" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
        <p className="font-semibold">No se pudo cargar el dashboard</p>
        <p className="mt-1">{error}</p>
        <div className="mt-4">
          <Button
            type="button"
            onClick={() => void loadDashboard()}
            className="border-rose-300 bg-white text-rose-700 hover:bg-rose-100"
          >
            Reintentar
          </Button>
        </div>
      </section>
    );
  }

  const openTicketsSubtitle = `${openTickets.length} abiertos en total`;
  const pendingPaymentsSubtitle = `${pendingAccounts.length} cuentas con saldo pendiente`;
  const devicesRangeSubtitle = `${selectedRangeDevices.length} dispositivos en el rango seleccionado`;

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-900 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-300">Dashboard operativo</p>
            <h1 className="text-3xl font-semibold tracking-tight">Empresa instaladora</h1>
            <p className="max-w-2xl text-sm text-slate-200">
              Controla proyectos en curso, tickets abiertos, ingresos reales, pagos pendientes y dispositivos instalados.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void loadDashboard()}
              className="border-white/20 bg-white text-slate-900 hover:bg-slate-100"
            >
              <RefreshCcw className="h-4 w-4" />
              Recargar
            </Button>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Proyectos en curso"
          value={String(projectsInProgress.length)}
          sublabel={`${projects.length} proyectos registrados`}
          icon={<HardHat className="h-5 w-5" />}
          accentClassName="border-blue-100"
        />
        <MetricCard
          label="Tickets abiertos"
          value={String(openTickets.length)}
          sublabel={`Urgente: ${openTicketsByPriority.urgente} | 24h: ${openTicketsByPriority["24h"]} | 48h: ${openTicketsByPriority["48h"]}`}
          icon={<Ticket className="h-5 w-5" />}
          accentClassName="border-amber-100"
        />
        <MetricCard
          label="Ingresos del mes"
          value={formatPaymentAmount(currentMonthIncome)}
          sublabel="Solo transacciones aprobadas este mes"
          icon={<CircleDollarSign className="h-5 w-5" />}
          accentClassName="border-emerald-100"
        />
        <MetricCard
          label="Pagos pendientes"
          value={formatPaymentAmount(pendingAccounts.reduce((sum, account) => sum + account.amountPending, 0))}
          sublabel={pendingPaymentsSubtitle}
          icon={<ShieldAlert className="h-5 w-5" />}
          accentClassName="border-rose-100"
        />
        <MetricCard
          label="Instalados en rango"
          value={String(selectedRangeDevices.length)}
          sublabel={devicesRangeSubtitle}
          icon={<Wrench className="h-5 w-5" />}
          accentClassName="border-teal-100"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Ingresos mensuales"
          subtitle="Tendencia de transacciones aprobadas en los ultimos 6 meses."
        >
          <div className="h-80">
            <Line
              data={incomeLineChart}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: { callbacks: { label: (ctx) => formatPaymentAmount(Number(ctx.raw ?? 0)) } },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: { color: "rgba(148, 163, 184, 0.15)" },
                    ticks: { callback: (value) => formatPaymentAmount(Number(value)) },
                  },
                  x: { grid: { display: false } },
                },
              }}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Tickets abiertos por prioridad"
          subtitle={openTicketsSubtitle}
        >
          <div className="h-80">
            <Doughnut
              data={ticketPriorityChart}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "bottom",
                    labels: { usePointStyle: true, boxWidth: 10, color: "#334155" },
                  },
                },
                cutout: "68%",
              }}
            />
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Proyectos en curso"
          subtitle="Seguimiento de las instalaciones activas."
        >
          {projectsInProgress.length === 0 ? (
            <EmptyState text="No hay proyectos en curso ahora mismo." />
          ) : (
            <div className="space-y-3">
              {projectsInProgress.slice(0, 5).map((project) => (
                <article key={project.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {project.customerName ?? "Cliente"} · {project.siteName ?? "Sitio"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Iniciado: {formatDateOnly(project.createdAt)} · Ultima actualizacion: {formatDateOnly(project.updatedAt)}
                      </p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusPillClass(project.status)}`}>
                      {formatProjectStatus(project.status)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Pagos pendientes"
          subtitle="Cuentas con saldo por cobrar."
        >
          {pendingAccounts.length === 0 ? (
            <EmptyState text="No hay pagos pendientes." />
          ) : (
            <div className="space-y-3">
              {pendingAccounts
                .slice()
                .sort((a, b) => b.amountPending - a.amountPending)
                .slice(0, 5)
                .map((account) => (
                  <article key={account.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {account.customerName ?? "Cliente"} · {account.siteName ?? "Sitio"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Factura {account.invoiceNumber} · Creada {formatDateOnly(account.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">{formatPaymentAmount(account.amountPending)}</p>
                        <p className="text-xs text-slate-500">Pendiente</p>
                      </div>
                    </div>
                  </article>
                ))}
            </div>
          )}
        </SectionCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Proyectos por estado"
          subtitle="Distribucion operativa de la cartera de instalaciones."
        >
          <div className="h-72">
            <Bar
              data={projectStatusChart}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: { color: "rgba(148, 163, 184, 0.15)" },
                    ticks: { precision: 0 },
                  },
                  x: { grid: { display: false } },
                },
              }}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Dispositivos instalados por periodo"
          subtitle="Tendencia de instalaciones en los ultimos 6 meses."
        >
          <div className="h-72">
            <Bar
              data={devicesBarChart}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: { color: "rgba(148, 163, 184, 0.15)" },
                    ticks: { precision: 0 },
                  },
                  x: { grid: { display: false } },
                },
              }}
            />
          </div>
        </SectionCard>
      </section>

      {canReadIncomeReport ? (
        <SectionCard
          title="Reporte de ingresos"
          subtitle="Solo transacciones aprobadas con detalle de fecha, metodo, monto y cliente."
          action={
            <Button
              type="button"
              onClick={downloadIncomeReport}
              disabled={incomeReportRows.length === 0 || !isIncomeRangeValid || !canDownloadIncomeReport}
              className="border-blue-300 bg-blue-600 text-white hover:bg-blue-500"
            >
              <Download className="h-4 w-4" />
              Descargar PDF
            </Button>
          }
        >
          <div className="grid gap-4 lg:grid-cols-4">
            <Field label="Desde">
              <Input
                type="date"
                value={rangeFrom}
                onChange={(event) => setRangeFrom(event.target.value)}
                className="border-slate-200 text-slate-700"
              />
            </Field>
            <Field label="Hasta">
              <Input
                type="date"
                value={rangeTo}
                onChange={(event) => setRangeTo(event.target.value)}
                className="border-slate-200 text-slate-700"
              />
            </Field>
            <div className="hidden lg:block" />
            <div className="hidden lg:block" />
          </div>

          {!isIncomeRangeValid ? (
            <p className="mt-3 text-sm font-medium text-amber-700">
              La fecha de inicio no puede ser mayor que la fecha final.
            </p>
          ) : null}

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total en rango</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{formatPaymentAmount(selectedRangeIncome)}</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Transacciones</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{selectedRangeTransactions.length}</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Clientes únicos</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {new Set(selectedRangeTransactions.map((transaction) => transaction.customerId)).size}
                </p>
              </article>
            </div>

            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Ingresos por método</p>
                  <p className="mt-1 text-sm text-slate-500">Distribución del rango seleccionado.</p>
                </div>
              </div>
              <div className="mt-4 h-56">
                <Doughnut
                  data={incomeMethodChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: "bottom",
                        labels: { usePointStyle: true, boxWidth: 10, color: "#334155" },
                      },
                    },
                    cutout: "68%",
                  }}
                />
              </div>
            </article>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Sitio</th>
                    <th className="px-4 py-3">Metodo</th>
                    <th className="px-4 py-3">Monto</th>
                    <th className="px-4 py-3">Factura</th>
                    <th className="px-4 py-3">Referencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {selectedRangeTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8">
                        <EmptyState text="No hay ingresos para el rango seleccionado." />
                      </td>
                    </tr>
                  ) : (
                    selectedRangeTransactions.map((transaction) => (
                      <tr key={transaction.id} className="align-top">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-700">{formatDateTime(transaction.approvedAt ?? transaction.submittedAt)}</td>
                        <td className="px-4 py-3 text-slate-700">{transaction.customerName ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{transaction.siteName ?? "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${methodPillClass(transaction.method)}`}>
                            {formatMethod(transaction.method)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">{formatPaymentAmount(transaction.amount)}</td>
                        <td className="px-4 py-3 text-slate-600">{transaction.invoiceNumber ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-600">
                          <span
                            className="block max-w-[220px] truncate"
                            title={transaction.reference ?? "-"}
                          >
                            {transaction.reference ?? "-"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {selectedRangeTransactions.length > 0 ? (
                  <tfoot className="border-t border-slate-100 bg-slate-50">
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-700" colSpan={4}>
                        Total
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{formatPaymentAmount(selectedRangeIncome)}</td>
                      <td className="px-4 py-3 text-slate-500" colSpan={2}>
                        {selectedRangeTransactions.length} transacciones
                      </td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          </div>
        </SectionCard>
      ) : null}
    </section>
  );
}
