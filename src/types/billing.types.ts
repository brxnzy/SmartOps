export type BillingCycle = "monthly" | "annual";

export type PlanLimits = {
  maxClients: number | null;
  maxSites: number | null;
  maxDevices: number | null;
  maxTechnicians: number | null;
  maxTicketsPerMonth: number | null;
  allowSimulator: boolean;
  allowAdvancedAutomations: boolean;
};

export type PricingPlan = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  price: number | null;
  billingCycle: BillingCycle;
  isActive: boolean;
  sortOrder: number;
  limits: PlanLimits | null;
};

export type CompanySubscription = {
  companyId: string;
  planId: string;
  status: "active" | "trialing" | "past_due" | "canceled";
  startDate: string;
  endDate: string | null;
};

export type CompanyEntitlements = {
  planKey: string;
  planName: string;
  limits: PlanLimits;
};

