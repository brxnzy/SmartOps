import { supabase } from "../libs/supabase";
import type { CompanyEntitlements } from "../types/billing.types";

type CompanySubscriptionRow = {
  company_id: string;
  status: string;
  pricing_plans?: {
    key: string;
    name: string;
    plan_limits?: {
      max_clients: number | null;
      max_sites: number | null;
      max_devices: number | null;
      max_technicians: number | null;
      max_tickets_per_month: number | null;
      allow_simulator: boolean | null;
      allow_advanced_automations: boolean | null;
    } | null;
  } | null;
};

export async function getCompanyEntitlements(companyId: string): Promise<CompanyEntitlements | null> {
  const { data, error } = await supabase
    .from("company_subscriptions")
    .select(
      `
      company_id,
      status,
      pricing_plans:plan_id (
        key,
        name,
        plan_limits (
          max_clients,
          max_sites,
          max_devices,
          max_technicians,
          max_tickets_per_month,
          allow_simulator,
          allow_advanced_automations
        )
      )
    `
    )
    .eq("company_id", companyId)
    .eq("status", "active")
    .maybeSingle<CompanySubscriptionRow>();

  if (error) {
    throw new Error(error.message || "No se pudo cargar el plan de la compañía.");
  }

  if (!data?.pricing_plans?.key) return null;

  const limits = data.pricing_plans.plan_limits;
  return {
    planKey: data.pricing_plans.key,
    planName: data.pricing_plans.name,
    limits: {
      maxClients: limits?.max_clients ?? null,
      maxSites: limits?.max_sites ?? null,
      maxDevices: limits?.max_devices ?? null,
      maxTechnicians: limits?.max_technicians ?? null,
      maxTicketsPerMonth: limits?.max_tickets_per_month ?? null,
      allowSimulator: Boolean(limits?.allow_simulator),
      allowAdvancedAutomations: Boolean(limits?.allow_advanced_automations),
    },
  };
}

