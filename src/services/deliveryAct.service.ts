import { supabase } from "../libs/supabase";
import type {
  DeliveryAct,
  DeliveryActCredential,
  DeliveryActDevice,
  DeliveryActGenerateResult,
  DeliveryActSignResult,
} from "../types/deliveryAct.types";

type DeliveryActRow = {
  id: string;
  company_id: string;
  project_id: string;
  status: string;
  pdf_url: string | null;
  pdf_path: string | null;
  delivered_at: string | null;
  signed_at: string | null;
  accepted_at: string | null;
  warranty_terms: string | null;
  devices_snapshot: DeliveryActDevice[] | null;
  credentials_snapshot: DeliveryActCredential[] | null;
  customer?: { name?: string | null } | null;
  technicians?: { name?: string | null } | null;
  projects?: { customer_sites?: { name?: string | null } | null } | null;
};

function safeText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function mapDeliveryAct(row: DeliveryActRow): DeliveryAct {
  return {
    id: row.id,
    companyId: safeText(row.company_id),
    projectId: safeText(row.project_id),
    status: (safeText(row.status, "pending") as DeliveryAct["status"]) ?? "pending",
    pdfUrl: row.pdf_url ?? null,
    pdfPath: row.pdf_path ?? null,
    deliveredAt: row.delivered_at ?? null,
    signedAt: row.signed_at ?? null,
    acceptedAt: row.accepted_at ?? null,
    warrantyTerms: row.warranty_terms ?? null,
    devices: row.devices_snapshot ?? [],
    credentials: row.credentials_snapshot ?? [],
    customerName: row.customer?.name ?? null,
    technicianName: row.technicians?.name ?? null,
    siteName: row.projects?.customer_sites?.name ?? null,
  };
}

async function getValidAccessToken(): Promise<string> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.error("[deliveryAct.service] session:error", sessionError);
  }

  let session = sessionData.session ?? null;
  const expiresAt = session?.expires_at ? session.expires_at * 1000 : null;
  if (!session || (expiresAt && expiresAt < Date.now() + 60_000)) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.error("[deliveryAct.service] refresh:error", refreshError);
    }
    session = refreshData.session ?? session;
  }

  const accessToken = session?.access_token ?? null;
  if (!accessToken) {
    throw new Error("No hay sesion activa para invocar la funcion.");
  }

  return accessToken;
}

async function callFunction<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  console.info("[deliveryAct.service] callFunction:start", { path, payload });

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Faltan variables de entorno de Supabase.");
  }

  const accessToken = await getValidAccessToken();
  const tokenPayload = (() => {
    try {
      return JSON.parse(atob(accessToken.split(".")[1]));
    } catch {
      return null;
    }
  })();

  console.log("[debug] invoke token length", accessToken?.length ?? 0);
  console.log("[debug] invoke token iss", tokenPayload?.iss ?? "no-token");
  console.log("[debug] invoke apikey length", supabaseAnonKey.length);

  const { data, error } = await supabase.functions.invoke(path, {
    body: payload,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
    },
  });

  if (error) {
    console.error("[deliveryAct.service] callFunction:error", {
      path,
      error,
    });
    throw new Error(error.message || "No se pudo completar la solicitud.");
  }

  console.info("[deliveryAct.service] callFunction:success", { path, data });
  return data as T;
}

export async function generateDeliveryAct(projectId: string): Promise<DeliveryActGenerateResult> {
  return callFunction<DeliveryActGenerateResult>("generate-delivery-act", { projectId });
}

export async function signDeliveryAct(
  actId: string,
  signature?: string | null
): Promise<DeliveryActSignResult> {
  return callFunction<DeliveryActSignResult>("sign-delivery-act", { actId, signature: signature ?? null });
}

export async function getDeliveryActById(actId: string): Promise<DeliveryAct> {
  const { data, error } = await supabase
    .from("delivery_acts")
    .select(
      `
      id,
      company_id,
      project_id,
      status,
      pdf_url,
      pdf_path,
      delivered_at,
      signed_at,
      accepted_at,
      warranty_terms,
      devices_snapshot,
      credentials_snapshot,
      customer:customer_id ( name ),
      technicians:technician_id ( name ),
      projects:project_id ( customer_sites:site_id ( name ) )
      `
    )
    .eq("id", actId)
    .maybeSingle<DeliveryActRow>();

  if (error || !data) {
    throw new Error(error?.message || "No se pudo cargar el acta.");
  }

  return mapDeliveryAct(data);
}

export async function getDeliveryActByProject(projectId: string): Promise<DeliveryAct | null> {
  const { data, error } = await supabase
    .from("delivery_acts")
    .select(
      `
      id,
      company_id,
      project_id,
      status,
      pdf_url,
      pdf_path,
      delivered_at,
      signed_at,
      accepted_at,
      warranty_terms,
      devices_snapshot,
      credentials_snapshot,
      customer:customer_id ( name ),
      technicians:technician_id ( name ),
      projects:project_id ( customer_sites:site_id ( name ) )
      `
    )
    .eq("project_id", projectId)
    .maybeSingle<DeliveryActRow>();

  if (error) {
    throw new Error(error.message || "No se pudo cargar el acta.");
  }

  if (!data) return null;
  return mapDeliveryAct(data);
}
