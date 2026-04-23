import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Button from "../../components/Button";
import { useAuth } from "../../hooks/useAuth";
import { useCustomerProfile360 } from "../../hooks/useCustomerProfile360";
import type { Customer360TabKey } from "../../types/customerProfile360.types";
import KpiGrid from "../../components/KpiGrid";
import CustomerHeader from "./customerProfile360/CustomerHeader";
import BudgetsSection from "./customerProfile360/sections/BudgetsSection";
import DevicesSection from "./customerProfile360/sections/DevicesSection";
import ProjectsSection from "./customerProfile360/sections/ProjectsSection";
import SitesSection from "./customerProfile360/sections/SitesSection";
import SummarySection from "./customerProfile360/sections/SummarySection";
import SurveysSection from "./customerProfile360/sections/SurveysSection";

export default function CustomerProfile360() {
  const { customerId } = useParams<{ customerId: string }>();
  const { companyProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<Customer360TabKey>("summary");

  const { data, loading, error, refresh } = useCustomerProfile360({
    companyId: companyProfile?.id ?? null,
    customerId,
  });

  const tabs = useMemo(() => {
    const source = data;
    return [
      { key: "summary", label: "Resumen", count: source?.timeline.length ?? 0 },
      { key: "sites", label: "Sitios", count: source?.sites.length ?? 0 },
      { key: "surveys", label: "Levantamientos", count: source?.surveys.length ?? 0 },
      { key: "budgets", label: "Cotizaciones", count: source?.budgets.length ?? 0 },
      { key: "projects", label: "Proyectos", count: source?.projects.length ?? 0 },
      { key: "devices", label: "Dispositivos", count: source?.devices.length ?? 0 },
    ] satisfies Array<{ key: Customer360TabKey; label: string; count: number }>;
  }, [data]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Cargando perfil 360 del cliente...
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="space-y-4">
        <Link to="/admin/customers" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600">
          <ArrowLeft size={16} />
          Volver a clientes
        </Link>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p className="font-semibold">No se pudo cargar el perfil 360</p>
          <p className="mt-1">{error ?? "Error inesperado."}</p>
          <div className="mt-3">
            <Button
              type="button"
              onClick={() => void refresh()}
              className="border-red-300 bg-white text-red-700 hover:bg-red-100"
            >
              Reintentar
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <CustomerHeader
        profile={data.profile}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        companyId={companyProfile?.id ?? null}
        customerId={customerId}
        onRefresh={refresh}
      />

      <KpiGrid kpis={data.kpis} />

      {activeTab === "summary" ? (
        <SummarySection profile={data.profile} timeline={data.timeline} />
      ) : null}

      {activeTab === "sites" ? (
        <SitesSection
          companyId={companyProfile?.id ?? null}
          customerId={customerId}
          sites={data.sites}
          onRefresh={refresh}
        />
      ) : null}

      {activeTab === "surveys" ? <SurveysSection surveys={data.surveys} /> : null}
      {activeTab === "budgets" ? <BudgetsSection budgets={data.budgets} /> : null}
      {activeTab === "projects" ? <ProjectsSection projects={data.projects} /> : null}
      {activeTab === "devices" ? <DevicesSection devices={data.devices} /> : null}

    </section>
  );
}
