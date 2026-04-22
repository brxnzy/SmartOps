import { supabase } from "../libs/supabase";
import { logAuditEvent } from "./audit.service";
import { listBudgetsForCustomer } from "./budget.service";
import { listInstallationProjectsByCustomer } from "./installation.service";
import { listSiteSurveys } from "./siteSurvey.service";
import { toPlanAwareErrorMessage } from "../utils/planLimits";
import type {
  CreateCustomerSiteInput,
  CustomerBudgetSummary,
  CustomerInstalledDeviceSummary,
  CustomerProfile360Data,
  CustomerProjectSummary,
  CustomerSurveySummary,
  CustomerSite,
  CustomerSiteAttachment,
  CustomerSiteAttachmentAsset,
  CustomerSiteZone,
  CustomerTimelineEvent,
  UpdateCustomerSiteInput,
} from "../types/customerProfile360.types";

let cachedCustomerRoleId: string | null = null;
const CUSTOMER_SITE_ATTACHMENT_BUCKET = "customer-site-attachments";

function safeText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safeNullableText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value ? value : null;
}

function normalizeStatus(value: unknown, fallback = "Sin estado"): string {
  const normalized = safeText(value, fallback);
  return normalized;
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function mapSites(rows: Array<Record<string, unknown>>): CustomerSite[] {
  return rows.map((row, index) => ({
    id: safeText(row.id, `site-${index}`),
    name: safeText(row.name, `Sitio ${index + 1}`),
    address: safeText(row.address, "Sin direccion"),
    city: safeNullableText(row.city),
    status: normalizeStatus(row.status, "Activo"),
    createdAt: safeDate(row.created_at),
  }));
}

function mapSiteAttachments(rows: Array<Record<string, unknown>>): CustomerSiteAttachment[] {
  return rows.map((row, index) => ({
    id: safeText(row.id, `attachment-${index}`),
    customerSiteId: safeText(row.customer_site_id, ""),
    companyId: safeText(row.company_id, ""),
    fileName: safeText(row.file_name, "Adjunto"),
    filePath: safeText(row.file_path, ""),
    createdAt: safeDate(row.created_at),
  }));
}

function mapSiteZones(rows: Array<Record<string, unknown>>): CustomerSiteZone[] {
  return rows.map((row, index) => ({
    id: safeText(row.id, `zone-${index}`),
    customerSiteId: safeText(row.customer_site_id, ""),
    companyId: safeText(row.company_id, ""),
    name: safeText(row.name, `Zona ${index + 1}`),
    createdAt: safeDate(row.created_at),
  }));
}

function toTimelineEvents(data: {
  createdAt: string;
  invitationStatus: string;
  invitationEmail: string | null;
  sites: CustomerSite[];
  surveys: CustomerSurveySummary[];
  budgets: CustomerBudgetSummary[];
  projects: CustomerProjectSummary[];
}): CustomerTimelineEvent[] {
  const events: CustomerTimelineEvent[] = [
    {
      id: "customer-created",
      type: "customer",
      title: "Cliente registrado",
      description: "Se creo el registro base del cliente en la plataforma.",
      at: data.createdAt,
    },
  ];

  if (data.invitationEmail) {
    events.push({
      id: "customer-invitation",
      type: "invitation",
      title: "Invitacion enviada",
      description: `Email ${data.invitationStatus}: ${data.invitationEmail}.`,
      at: data.createdAt,
    });
  }

  events.push(
    ...data.sites
      .filter((item) => item.createdAt)
      .map((item) => ({
        id: `site-${item.id}`,
        type: "site",
        title: `Sitio: ${item.name}`,
        description: `${item.status} - ${item.address}`,
        at: item.createdAt as string,
      }))
  );

  events.push(
    ...data.surveys
      .filter((item) => item.createdAt)
      .map((item) => ({
        id: `survey-${item.id}`,
        type: "survey",
        title: `Levantamiento ${item.status}`,
        description: `${item.siteName ?? "Sitio"} · visita ${item.visitStatus ?? "sin_visita"}`,
        at: item.createdAt as string,
      }))
  );

  events.push(
    ...data.budgets.map((item) => ({
      id: `budget-${item.id}`,
      type: "budget",
      title: `Cotizacion ${item.status}`,
      description: `${item.siteName ?? "Sitio"} · Total ${item.total.toLocaleString("es-DO", { style: "currency", currency: "USD" })}`,
      at: item.createdAt,
    }))
  );

  events.push(
    ...data.projects
      .filter((item) => item.createdAt)
      .map((item) => ({
        id: `project-${item.id}`,
        type: "project",
        title: `Proyecto ${item.status}`,
        description: `${item.siteName ?? "Sitio"} · visita ${item.visitStatus ?? "sin_visita"}`,
        at: item.createdAt as string,
      }))
  );

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function mapSurveys(data: Awaited<ReturnType<typeof listSiteSurveys>>, customerId: string): CustomerSurveySummary[] {
  return data
    .filter((survey) => survey.customerId === customerId)
    .map((survey) => ({
      id: survey.id,
      status: survey.status ?? "pendiente",
      visitStatus: survey.visitStatus,
      siteName: survey.siteName,
      technicianName: survey.technicianName,
      scheduledStart: survey.scheduledStart,
      scheduledEnd: survey.scheduledEnd,
      createdAt: survey.createdAt,
      completedAt: survey.completedAt,
    }))
    .sort((a, b) => Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? ""));
}

function mapBudgets(data: Awaited<ReturnType<typeof listBudgetsForCustomer>>): CustomerBudgetSummary[] {
  return data.map((budget) => ({
    id: budget.id,
    status: budget.status,
    quoteStatus: budget.quoteStatus ?? null,
    siteName: budget.siteName,
    subtotal: budget.subtotal,
    taxAmount: budget.taxAmount,
    total: budget.total,
    createdAt: budget.createdAt,
    sentAt: budget.sentAt,
    approvedAt: budget.approvedAt,
    rejectedAt: budget.rejectedAt,
    expiresAt: budget.expiresAt,
  }));
}

function mapProjects(data: Awaited<ReturnType<typeof listInstallationProjectsByCustomer>>, sites: CustomerSite[]): CustomerProjectSummary[] {
  const siteNameById = new Map(sites.map((site) => [site.id, site.name]));
  return data.map((project) => ({
    id: project.id,
    budgetId: project.budgetId,
    status: project.status,
    siteName: siteNameById.get(project.siteId) ?? null,
    technicianName: project.technicianName,
    visitStatus: project.technicalVisitStatus,
    scheduledStart: project.scheduledStart,
    scheduledEnd: project.scheduledEnd,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  }));
}

async function getCustomerRoleId(): Promise<string> {
  if (cachedCustomerRoleId) return cachedCustomerRoleId;

  const { data, error } = await supabase
    .from("roles")
    .select("id")
    .eq("name", "customer")
    .maybeSingle<{ id: string }>();

  if (error || !data?.id) {
    throw new Error(error?.message || "No se encontro el rol customer.");
  }

  cachedCustomerRoleId = data.id;
  return data.id;
}

export async function getCustomerProfile360(
  companyId: string,
  customerId: string
): Promise<CustomerProfile360Data> {
  const customerRoleId = await getCustomerRoleId();

  const { data: membership, error: membershipError } = await supabase
    .from("user_roles")
    .select("id")
    .eq("company_id", companyId)
    .eq("user_id", customerId)
    .eq("role_id", customerRoleId)
    .maybeSingle<{ id: string }>();

  if (membershipError) {
    throw new Error(membershipError.message || "No se pudo validar el acceso al cliente.");
  }

  if (!membership?.id) {
    throw new Error("El cliente no pertenece a esta compania o no existe.");
  }

  const [userResponse, customerResponse, invitationResponse] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, id_card")
      .eq("id", customerId)
      .single<{ id: string; name: string; id_card: string | null }>(),
    supabase
      .from("customers")
      .select("user_id, phone, tax_id, type, created_at")
      .eq("user_id", customerId)
      .single<{
        user_id: string;
        phone: string | null;
        tax_id: string;
        type: "hogar" | "comercio" | "empresa";
        created_at: string | null;
      }>(),
    supabase
      .from("customer_invitations")
      .select("email, accepted_at, expires_at, created_at")
      .eq("company_id", companyId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{
        email: string;
        accepted_at: string | null;
        expires_at: string;
        created_at: string | null;
      }>(),
  ]);

  if (userResponse.error || !userResponse.data) {
    throw new Error(userResponse.error?.message || "No se pudo cargar el perfil del cliente.");
  }

  if (customerResponse.error || !customerResponse.data) {
    throw new Error(customerResponse.error?.message || "No se pudo cargar datos del cliente.");
  }

  const invitationRow = invitationResponse.error ? null : invitationResponse.data;
  const now = Date.now();
  const invitationStatus = invitationRow?.accepted_at
    ? "accepted"
    : invitationRow?.expires_at && new Date(invitationRow.expires_at).getTime() <= now
      ? "expired"
      : invitationRow?.email
        ? "pending"
        : "none";

  const [siteResponse, surveysResponse, budgetsResponse, projectsResponse] = await Promise.all([
    supabase
      .from("customer_sites")
      .select("*")
      .eq("company_id", companyId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    listSiteSurveys(companyId),
    listBudgetsForCustomer(companyId, customerId),
    listInstallationProjectsByCustomer(companyId, customerId),
  ]);

  if (siteResponse.error) {
    const firstError =
      siteResponse.error;
    throw new Error(
      `${firstError?.message ?? "No se pudo cargar Perfil 360."} Ejecuta la migracion de Perfil 360 en Supabase.`
    );
  }

  const sites = mapSites((siteResponse.data ?? []) as Array<Record<string, unknown>>);
  const surveys = mapSurveys(surveysResponse, customerId);
  const budgets = mapBudgets(budgetsResponse);
  const projects = mapProjects(projectsResponse, sites);

  const projectIds = projects.map((project) => project.id);
  let devices: CustomerInstalledDeviceSummary[] = [];

  if (projectIds.length > 0) {
    const { data: consumptionRows, error: consumptionError } = await supabase
      .from("installation_project_inventory_consumption")
      .select("project_id, device_id, quantity, consumed_at, devices:device_id ( name, model )")
      .eq("company_id", companyId)
      .in("project_id", projectIds)
      .order("consumed_at", { ascending: false });

    if (consumptionError) {
      throw new Error(consumptionError.message || "No se pudo cargar consumo de dispositivos del cliente.");
    }

    const aggregate = new Map<
      string,
      { deviceId: string; deviceName: string | null; deviceModel: string | null; totalQuantity: number; lastInstalledAt: string | null }
    >();

    (consumptionRows ?? []).forEach((row) => {
      const deviceId = safeText(row.device_id);
      if (!deviceId) return;
      const deviceRow = Array.isArray(row.devices) ? row.devices[0] : row.devices;
      const quantity = Number(row.quantity ?? 0);
      const consumedAt = safeDate(row.consumed_at);
      const current = aggregate.get(deviceId) ?? {
        deviceId,
        deviceName: safeNullableText(deviceRow?.name),
        deviceModel: safeNullableText(deviceRow?.model),
        totalQuantity: 0,
        lastInstalledAt: null,
      };

      current.totalQuantity += Number.isFinite(quantity) ? quantity : 0;
      if (!current.lastInstalledAt && consumedAt) {
        current.lastInstalledAt = consumedAt;
      }

      aggregate.set(deviceId, current);
    });

    devices = Array.from(aggregate.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }

  const profile = {
    id: userResponse.data.id,
    companyId,
    name: userResponse.data.name,
    idCard: userResponse.data.id_card,
    phone: customerResponse.data.phone,
    taxId: customerResponse.data.tax_id,
    type: customerResponse.data.type,
    createdAt: customerResponse.data.created_at ?? new Date().toISOString(),
    invitationEmail: invitationRow?.email ?? null,
    invitationStatus,
  } as const;

  const kpis = {
    sites: sites.length,
    surveys: surveys.length,
    budgets: budgets.length,
    projects: projects.length,
    devices: devices.reduce((acc, item) => acc + item.totalQuantity, 0),
  };

  const timeline = toTimelineEvents({
    createdAt: profile.createdAt,
    invitationEmail: profile.invitationEmail,
    invitationStatus: profile.invitationStatus,
    sites,
    surveys,
    budgets,
    projects,
  });

  return {
    profile,
    kpis,
    sites,
    surveys,
    budgets,
    projects,
    devices,
    timeline,
  };
}

export async function createCustomerSite(
  companyId: string,
  customerId: string,
  input: CreateCustomerSiteInput
): Promise<CustomerSite> {
  const name = input.name.trim();
  const address = input.address.trim();

  if (!name) throw new Error("El nombre del sitio es obligatorio.");
  if (!address) throw new Error("La direccion del sitio es obligatoria.");

  const { data, error } = await supabase
    .from("customer_sites")
    .insert({
      company_id: companyId,
      customer_id: customerId,
      name,
      address,
      city: input.city?.trim() || null,
      status: input.status?.trim().toLowerCase() || "active",
    })
    .select("id, name, address, city, status, created_at")
    .single();

  if (error || !data) {
    throw new Error(toPlanAwareErrorMessage(error, "No se pudo crear el sitio."));
  }
  const created = mapSites([data])[0];
  await logAuditEvent({
    action: "create",
    entity: "customer_sites",
    entityId: created.id,
    companyId,
    newValues: {
      name: created.name,
      address: created.address,
      city: created.city,
      status: created.status,
      customerId,
    },
  });
  return created;
}

export async function updateCustomerSite(
  companyId: string,
  customerId: string,
  input: UpdateCustomerSiteInput
): Promise<void> {
  const name = input.name.trim();
  const address = input.address.trim();

  if (!name) throw new Error("El nombre del sitio es obligatorio.");
  if (!address) throw new Error("La direccion del sitio es obligatoria.");

  const { error } = await supabase
    .from("customer_sites")
    .update({
      name,
      address,
      city: input.city?.trim() || null,
      status: input.status?.trim().toLowerCase() || "active",
    })
    .eq("id", input.siteId)
    .eq("company_id", companyId)
    .eq("customer_id", customerId);

  if (error) {
    throw new Error(error.message || "No se pudo actualizar el sitio.");
  }
  await logAuditEvent({
    action: "update",
    entity: "customer_sites",
    entityId: input.siteId,
    companyId,
    newValues: {
      name,
      address,
      city: input.city?.trim() || null,
      status: input.status?.trim().toLowerCase() || "active",
      customerId,
    },
  });
}

export async function deleteCustomerSite(
  companyId: string,
  customerId: string,
  siteId: string
): Promise<void> {
  const { error } = await supabase
    .from("customer_sites")
    .delete()
    .eq("id", siteId)
    .eq("company_id", companyId)
    .eq("customer_id", customerId);

  if (error) {
    throw new Error(error.message || "No se pudo eliminar el sitio.");
  }
  await logAuditEvent({
    action: "delete",
    entity: "customer_sites",
    entityId: siteId,
    companyId,
    oldValues: { customerId },
  });
}

export async function getCustomerSiteAttachments(
  companyId: string,
  siteId: string
): Promise<CustomerSiteAttachment[]> {
  const { data, error } = await supabase
    .from("customer_site_attachments")
    .select("id, customer_site_id, company_id, file_name, file_path, created_at")
    .eq("company_id", companyId)
    .eq("customer_site_id", siteId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message || "No se pudieron cargar los adjuntos del sitio.");
  }

  return mapSiteAttachments(data ?? []);
}

export async function getCustomerSiteAttachmentAssets(
  companyId: string,
  siteId: string
): Promise<CustomerSiteAttachmentAsset[]> {
  const attachments = await getCustomerSiteAttachments(companyId, siteId);

  const assets = await Promise.all(
    attachments.map(async (attachment) => {
      const { data: signedData, error: signedError } = await supabase.storage
        .from(CUSTOMER_SITE_ATTACHMENT_BUCKET)
        .createSignedUrl(attachment.filePath, 60 * 60);

      if (!signedError && signedData?.signedUrl) {
        return { ...attachment, url: signedData.signedUrl };
      }

      const { data: publicData } = supabase.storage
        .from(CUSTOMER_SITE_ATTACHMENT_BUCKET)
        .getPublicUrl(attachment.filePath);

      return { ...attachment, url: publicData.publicUrl };
    })
  );

  return assets;
}

export async function getCustomerSiteZones(
  companyId: string,
  siteId: string
): Promise<CustomerSiteZone[]> {
  const { data, error } = await supabase
    .from("customer_site_zones")
    .select("id, customer_site_id, company_id, name, created_at")
    .eq("company_id", companyId)
    .eq("customer_site_id", siteId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message || "No se pudieron cargar las zonas del sitio.");
  }

  return mapSiteZones(data ?? []);
}

export async function createCustomerSiteZone(
  companyId: string,
  siteId: string,
  name: string
): Promise<CustomerSiteZone> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("El nombre de la zona es obligatorio.");
  }

  const { data, error } = await supabase
    .from("customer_site_zones")
    .insert({
      company_id: companyId,
      customer_site_id: siteId,
      name: trimmed,
    })
    .select("id, customer_site_id, company_id, name, created_at")
    .single();

  if (error || !data) {
    throw new Error(toPlanAwareErrorMessage(error, "No se pudo crear la zona."));
  }
  const created = mapSiteZones([data])[0];
  await logAuditEvent({
    action: "create",
    entity: "customer_site_zones",
    entityId: created.id,
    companyId,
    newValues: {
      name: created.name,
      siteId: created.customerSiteId,
    },
  });
  return created;
}

export async function updateCustomerSiteZone(
  companyId: string,
  siteId: string,
  zoneId: string,
  name: string
): Promise<CustomerSiteZone> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("El nombre de la zona es obligatorio.");
  }

  const { data, error } = await supabase
    .from("customer_site_zones")
    .update({
      name: trimmed,
    })
    .eq("id", zoneId)
    .eq("company_id", companyId)
    .eq("customer_site_id", siteId)
    .select("id, customer_site_id, company_id, name, created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "No se pudo actualizar la zona.");
  }
  const updated = mapSiteZones([data])[0];
  await logAuditEvent({
    action: "update",
    entity: "customer_site_zones",
    entityId: updated.id,
    companyId,
    newValues: {
      name: updated.name,
      siteId: updated.customerSiteId,
    },
  });
  return updated;
}

export async function deleteCustomerSiteZone(
  companyId: string,
  siteId: string,
  zoneId: string
): Promise<void> {
  const { error } = await supabase
    .from("customer_site_zones")
    .delete()
    .eq("id", zoneId)
    .eq("company_id", companyId)
    .eq("customer_site_id", siteId);

  if (error) {
    throw new Error(error.message || "No se pudo eliminar la zona.");
  }
  await logAuditEvent({
    action: "delete",
    entity: "customer_site_zones",
    entityId: zoneId,
    companyId,
    oldValues: { siteId },
  });
}

export async function uploadCustomerSiteAttachments(
  companyId: string,
  siteId: string,
  files: File[]
): Promise<CustomerSiteAttachment[]> {
  if (files.length === 0) return [];
  if (files.length > 3) {
    throw new Error("Solo se permiten 3 adjuntos por sitio.");
  }

  const created: CustomerSiteAttachment[] = [];

  for (const file of files) {
    const fileName = safeText(file.name, "adjunto");
    const sanitizedName = sanitizeFileName(fileName);
    const filePath = `${companyId}/${siteId}/${crypto.randomUUID()}-${sanitizedName}`;

    const { error: uploadError } = await supabase.storage
      .from(CUSTOMER_SITE_ATTACHMENT_BUCKET)
      .upload(filePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message || "No se pudo subir el adjunto.");
    }

    const { data, error } = await supabase
      .from("customer_site_attachments")
      .insert({
        customer_site_id: siteId,
        company_id: companyId,
        file_name: fileName,
        file_path: filePath,
      })
      .select("id, customer_site_id, company_id, file_name, file_path, created_at")
      .single();

    if (error || !data) {
      await supabase.storage.from(CUSTOMER_SITE_ATTACHMENT_BUCKET).remove([filePath]);
      throw new Error(error?.message || "No se pudo registrar el adjunto.");
    }

    const mapped = mapSiteAttachments([data])[0];
    await logAuditEvent({
      action: "create",
      entity: "customer_site_attachments",
      entityId: mapped.id,
      companyId,
      newValues: {
        name: mapped.fileName,
        siteId: mapped.customerSiteId,
        filePath: mapped.filePath,
      },
    });
    created.push(mapped);
  }

  return created;
}

export async function deleteCustomerSiteWithAttachments(
  companyId: string,
  customerId: string,
  siteId: string
): Promise<{ filesRemoved: boolean; fileRemovalError?: string }> {
  const attachments = await getCustomerSiteAttachments(companyId, siteId);

  await deleteCustomerSite(companyId, customerId, siteId);

  if (attachments.length === 0) {
    return { filesRemoved: true };
  }

  const { error } = await supabase.storage
    .from(CUSTOMER_SITE_ATTACHMENT_BUCKET)
    .remove(attachments.map((item) => item.filePath));

  if (error) {
    return {
      filesRemoved: false,
      fileRemovalError: error.message || "No se pudieron eliminar los archivos del sitio.",
    };
  }

  return { filesRemoved: true };
}
