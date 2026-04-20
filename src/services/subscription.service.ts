import { supabase } from "../libs/supabase";

export async function changeCompanyPlan(companyId: string, planKey: string): Promise<void> {
  const { error } = await supabase.rpc("change_company_plan", {
    p_company_id: companyId,
    p_plan_key: planKey,
  });

  if (error) {
    throw new Error(error.message || "No se pudo cambiar el plan de la compañía.");
  }
}

