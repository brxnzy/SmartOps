import { supabase } from "../libs/supabase";
import type { PricingPlan } from "../types/billing.types";

type PricingPlanRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  price: number | null;
  billing_cycle: "monthly" | "annual";
  is_active: boolean;
  sort_order: number;
  plan_limits?: {
    max_clients: number | null;
    max_sites: number | null;
    max_devices: number | null;
    max_technicians: number | null;
    max_tickets_per_month: number | null;
    allow_simulator: boolean | null;
    allow_advanced_automations: boolean | null;
  } | null;
};

export async function listActivePricingPlans(): Promise<PricingPlan[]> {
  const { data, error } = await supabase
    .from("pricing_plans")
    .select(
      `
      id,
      key,
      name,
      description,
      price,
      billing_cycle,
      is_active,
      sort_order,
      plan_limits (
        max_clients,
        max_sites,
        max_devices,
        max_technicians,
        max_tickets_per_month,
        allow_simulator,
        allow_advanced_automations
      )
    `
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .returns<PricingPlanRow[]>();

  if (error) {
    throw new Error(error.message || "No se pudieron cargar los planes.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description ?? null,
    price: row.price ?? null,
    billingCycle: row.billing_cycle,
    isActive: Boolean(row.is_active),
    sortOrder: row.sort_order ?? 0,
    limits: row.plan_limits
      ? {
          maxClients: row.plan_limits.max_clients ?? null,
          maxSites: row.plan_limits.max_sites ?? null,
          maxDevices: row.plan_limits.max_devices ?? null,
          maxTechnicians: row.plan_limits.max_technicians ?? null,
          maxTicketsPerMonth: row.plan_limits.max_tickets_per_month ?? null,
          allowSimulator: Boolean(row.plan_limits.allow_simulator),
          allowAdvancedAutomations: Boolean(row.plan_limits.allow_advanced_automations),
        }
      : null,
  }));
}

