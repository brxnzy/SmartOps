import { supabase } from "../libs/supabase";
import type {
  CreateCustomerInstallationInput,
  CreateCustomerQuoteInput,
  CreateCustomerSiteInput,
  CreateCustomerTicketInput,
  CustomerBillingRecord,
  CustomerContractPlan,
  CustomerInstalledDevice,
  CustomerInstallation,
  CustomerProfile360Data,
  CustomerQuote,
  CustomerSite,
  CustomerSiteAttachment,
  CustomerSiteAttachmentAsset,
  CustomerSiteZone,
  CustomerTechnicalVisit,
  CustomerTicket,
  CustomerTimelineEvent,
  UpdateCustomerInstallationInput,
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

function safeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function safeDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value ? value : null;
}

function normalizeStatus(value: unknown, fallback = "Sin estado"): string {
  const normalized = safeText(value, fallback);
  return normalized;
}

function normalizeCode(prefix: string, rawId: unknown): string {
  const base = safeText(rawId, "n/a").replaceAll("-", "").toUpperCase();
  return `${prefix}-${base.slice(0, 6)}`;
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

function mapInstallations(rows: Array<Record<string, unknown>>): CustomerInstallation[] {
  return rows.map((row, index) => ({
    id: safeText(row.id, `installation-${index}`),
    siteId: safeNullableText(row.site_id),
    name: safeText(row.name, `Instalacion ${index + 1}`),
    siteName: safeNullableText(row.site_name),
    workDescription: safeNullableText(row.work_description),
    status: normalizeStatus(row.status, "Activa"),
    createdAt: safeDate(row.created_at),
  }));
}

function mapDevices(rows: Array<Record<string, unknown>>): CustomerInstalledDevice[] {
  return rows.map((row, index) => ({
    id: safeText(row.id, `device-${index}`),
    name: safeText(row.name, `Dispositivo ${index + 1}`),
    serial: safeNullableText(row.serial),
    status: normalizeStatus(row.status, "Operativo"),
    installationName: safeNullableText(row.installation_name),
    createdAt: safeDate(row.created_at),
  }));
}

function mapContracts(rows: Array<Record<string, unknown>>): CustomerContractPlan[] {
  return rows.map((row, index) => ({
    id: safeText(row.id, `contract-${index}`),
    planName: safeText(row.plan_name, `Plan ${index + 1}`),
    status: normalizeStatus(row.status, "Activo"),
    amount: safeNumber(row.amount),
    currency: safeNullableText(row.currency),
    startDate: safeDate(row.start_date),
    endDate: safeDate(row.end_date),
  }));
}

function mapBilling(
  invoiceRows: Array<Record<string, unknown>>,
  paymentRows: Array<Record<string, unknown>>
): CustomerBillingRecord[] {
  const invoices = invoiceRows.map((row, index) => ({
    id: safeText(row.id, `invoice-${index}`),
    reference: safeText(row.number, normalizeCode("INV", row.id)),
    kind: "invoice" as const,
    status: normalizeStatus(row.status, "Pendiente"),
    amount: safeNumber(row.amount),
    currency: safeNullableText(row.currency),
    issuedAt: safeDate(row.issued_at ?? row.created_at),
    dueAt: safeDate(row.due_at),
    paidAt: safeDate(row.paid_at),
  }));

  const payments = paymentRows.map((row, index) => ({
    id: safeText(row.id, `payment-${index}`),
    reference: safeText(row.reference, normalizeCode("PAY", row.id)),
    kind: "payment" as const,
    status: normalizeStatus(row.status, "Aplicado"),
    amount: safeNumber(row.amount),
    currency: safeNullableText(row.currency),
    issuedAt: safeDate(row.created_at),
    dueAt: null,
    paidAt: safeDate(row.paid_at ?? row.created_at),
  }));

  return [...invoices, ...payments];
}

function mapTickets(rows: Array<Record<string, unknown>>): CustomerTicket[] {
  return rows.map((row, index) => ({
    id: safeText(row.id, `ticket-${index}`),
    code: safeText(row.code, normalizeCode("TK", row.id)),
    title: safeText(row.title, `Ticket ${index + 1}`),
    status: normalizeStatus(row.status, "Abierto"),
    priority: safeText(row.priority, "Media"),
    openedAt: safeDate(row.created_at),
    closedAt: safeDate(row.closed_at),
  }));
}

function mapQuotes(rows: Array<Record<string, unknown>>): CustomerQuote[] {
  return rows.map((row, index) => ({
    id: safeText(row.id, `quote-${index}`),
    code: safeText(row.code, normalizeCode("QT", row.id)),
    title: safeText(row.title, `Cotizacion ${index + 1}`),
    status: normalizeStatus(row.status, "Pendiente"),
    amount: safeNumber(row.amount),
    currency: safeNullableText(row.currency),
    createdAt: safeDate(row.created_at),
  }));
}

function mapVisits(rows: Array<Record<string, unknown>>): CustomerTechnicalVisit[] {
  return rows.map((row, index) => ({
    id: safeText(row.id, `visit-${index}`),
    title: safeText(row.title, `Visita ${index + 1}`),
    status: normalizeStatus(row.status, "Completada"),
    technicianName: safeNullableText(row.technician_name),
    scheduledAt: safeDate(row.scheduled_at ?? row.created_at),
    finishedAt: safeDate(row.finished_at),
  }));
}

function toTimelineEvents(data: {
  createdAt: string;
  invitationStatus: string;
  invitationEmail: string | null;
  sites: CustomerSite[];
  installations: CustomerInstallation[];
  contracts: CustomerContractPlan[];
  tickets: CustomerTicket[];
  quotes: CustomerQuote[];
  visits: CustomerTechnicalVisit[];
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
    ...data.installations
      .filter((item) => item.createdAt)
      .map((item) => ({
        id: `installation-${item.id}`,
        type: "installation",
        title: `Instalacion: ${item.name}`,
        description: `${item.status}${item.siteName ? ` - ${item.siteName}` : ""}`,
        at: item.createdAt as string,
      }))
  );

  events.push(
    ...data.contracts
      .filter((item) => item.startDate)
      .map((item) => ({
        id: `contract-${item.id}`,
        type: "contract",
        title: `Contrato/plan: ${item.planName}`,
        description: `Estado: ${item.status}`,
        at: item.startDate as string,
      }))
  );

  events.push(
    ...data.tickets
      .filter((item) => item.openedAt)
      .map((item) => ({
        id: `ticket-${item.id}`,
        type: "ticket",
        title: `${item.code} - ${item.title}`,
        description: `Prioridad ${item.priority}. Estado ${item.status}.`,
        at: item.openedAt as string,
      }))
  );

  events.push(
    ...data.quotes
      .filter((item) => item.createdAt)
      .map((item) => ({
        id: `quote-${item.id}`,
        type: "quote",
        title: `Cotizacion ${item.code}`,
        description: `${item.title} - ${item.status}`,
        at: item.createdAt as string,
      }))
  );

  events.push(
    ...data.visits
      .filter((item) => item.scheduledAt)
      .map((item) => ({
        id: `visit-${item.id}`,
        type: "visit",
        title: `Visita tecnica: ${item.title}`,
        description: `Estado: ${item.status}`,
        at: item.scheduledAt as string,
      }))
  );

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
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

  const [
    siteResponse,
    installationResponse,
    deviceResponse,
    contractResponse,
    invoiceResponse,
    paymentResponse,
    ticketResponse,
    quoteResponse,
    visitResponse,
  ] = await Promise.all([
    supabase
      .from("customer_sites")
      .select("*")
      .eq("company_id", companyId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("customer_installations")
      .select("id, name, work_description, status, created_at, customer_sites(name)")
      .eq("company_id", companyId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("customer_devices")
      .select("id, name, serial, status, created_at, customer_installations(name)")
      .eq("company_id", companyId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("customer_contracts")
      .select("*")
      .eq("company_id", companyId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("*")
      .eq("company_id", companyId)
      .eq("customer_id", customerId)
      .order("issued_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("payments")
      .select("*")
      .eq("company_id", companyId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("tickets")
      .select("*")
      .eq("company_id", companyId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("quotes")
      .select("*")
      .eq("company_id", companyId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("technical_visits")
      .select("*")
      .eq("company_id", companyId)
      .eq("customer_id", customerId)
      .order("scheduled_at", { ascending: false, nullsFirst: false }),
  ]);

  if (
    siteResponse.error ||
    installationResponse.error ||
    deviceResponse.error ||
    contractResponse.error ||
    invoiceResponse.error ||
    paymentResponse.error ||
    ticketResponse.error ||
    quoteResponse.error ||
    visitResponse.error
  ) {
    const firstError =
      siteResponse.error ||
      installationResponse.error ||
      deviceResponse.error ||
      contractResponse.error ||
      invoiceResponse.error ||
      paymentResponse.error ||
      ticketResponse.error ||
      quoteResponse.error ||
      visitResponse.error;
    throw new Error(
      `${firstError?.message ?? "No se pudo cargar Perfil 360."} Ejecuta la migracion de Perfil 360 en Supabase.`
    );
  }

  const sites = mapSites((siteResponse.data ?? []) as Array<Record<string, unknown>>);
  const installations = mapInstallations(
    ((installationResponse.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      ...row,
      site_name: Array.isArray(row.customer_sites)
        ? safeText(row.customer_sites[0]?.name)
        : typeof row.customer_sites === "object" && row.customer_sites
          ? safeText((row.customer_sites as { name?: unknown }).name)
          : null,
    }))
  );
  const devices = mapDevices(
    ((deviceResponse.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      ...row,
      installation_name: Array.isArray(row.customer_installations)
        ? safeText(row.customer_installations[0]?.name)
        : typeof row.customer_installations === "object" && row.customer_installations
          ? safeText((row.customer_installations as { name?: unknown }).name)
          : null,
    }))
  );
  const contracts = mapContracts((contractResponse.data ?? []) as Array<Record<string, unknown>>);
  const billing = mapBilling(
    (invoiceResponse.data ?? []) as Array<Record<string, unknown>>,
    (paymentResponse.data ?? []) as Array<Record<string, unknown>>
  );
  const tickets = mapTickets((ticketResponse.data ?? []) as Array<Record<string, unknown>>);
  const quotes = mapQuotes((quoteResponse.data ?? []) as Array<Record<string, unknown>>);
  const visits = mapVisits((visitResponse.data ?? []) as Array<Record<string, unknown>>);

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

  const lowerOpenTicketStatuses = new Set(["open", "abierto", "pendiente", "in_progress", "en curso"]);
  const lowerPendingQuoteStatuses = new Set(["pending", "pendiente", "draft", "borrador"]);
  const lowerPendingInvoiceStatuses = new Set(["pending", "pendiente", "overdue", "vencida"]);

  const kpis = {
    installations: installations.length,
    devices: devices.length,
    contracts: contracts.length,
    pendingInvoices: billing.filter(
      (item) =>
        item.kind === "invoice" && lowerPendingInvoiceStatuses.has(item.status.trim().toLowerCase())
    ).length,
    openTickets: tickets.filter((item) =>
      lowerOpenTicketStatuses.has(item.status.trim().toLowerCase())
    ).length,
    pendingQuotes: quotes.filter((item) =>
      lowerPendingQuoteStatuses.has(item.status.trim().toLowerCase())
    ).length,
    technicalVisits: visits.length,
  };

  const timeline = toTimelineEvents({
    createdAt: profile.createdAt,
    invitationEmail: profile.invitationEmail,
    invitationStatus: profile.invitationStatus,
    sites,
    installations,
    contracts,
    tickets,
    quotes,
    visits,
  });

  return {
    profile,
    kpis,
    sites,
    installations,
    devices,
    contracts,
    billing,
    tickets,
    quotes,
    visits,
    timeline,
  };
}

export async function createCustomerTicket(
  companyId: string,
  customerId: string,
  input: CreateCustomerTicketInput
): Promise<void> {
  const title = input.title.trim();
  if (!title) throw new Error("El titulo del ticket es obligatorio.");

  const code = `TK-${crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`;

  const { error } = await supabase.from("tickets").insert({
    company_id: companyId,
    customer_id: customerId,
    code,
    title,
    priority: input.priority.trim().toLowerCase() || "media",
    status: "abierto",
  });

  if (error) {
    throw new Error(error.message || "No se pudo crear el ticket.");
  }
}

export async function createCustomerQuote(
  companyId: string,
  customerId: string,
  input: CreateCustomerQuoteInput
): Promise<void> {
  const title = input.title.trim();
  if (!title) throw new Error("El titulo de la cotizacion es obligatorio.");

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("El monto de la cotizacion debe ser mayor que 0.");
  }

  const code = `QT-${crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`;
  const currency = input.currency.trim().toUpperCase() || "DOP";

  const { error } = await supabase.from("quotes").insert({
    company_id: companyId,
    customer_id: customerId,
    code,
    title,
    status: "pendiente",
    amount: input.amount,
    currency,
  });

  if (error) {
    throw new Error(error.message || "No se pudo crear la cotizacion.");
  }
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
    throw new Error(error?.message || "No se pudo crear el sitio.");
  }

  return mapSites([data])[0];
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
    throw new Error(error?.message || "No se pudo crear la zona.");
  }

  return mapSiteZones([data])[0];
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

  return mapSiteZones([data])[0];
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

    created.push(...mapSiteAttachments([data]));
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

export async function createCustomerInstallation(
  companyId: string,
  customerId: string,
  input: CreateCustomerInstallationInput
): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error("El nombre de la instalacion es obligatorio.");

  const { error } = await supabase.from("customer_installations").insert({
    company_id: companyId,
    customer_id: customerId,
    site_id: input.siteId ?? null,
    name,
    work_description: input.workDescription?.trim() || null,
    status: input.status?.trim().toLowerCase() || "active",
    address: "N/A",
  });

  if (error) {
    throw new Error(error.message || "No se pudo crear la instalacion.");
  }
}

export async function updateCustomerInstallation(
  companyId: string,
  customerId: string,
  input: UpdateCustomerInstallationInput
): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error("El nombre de la instalacion es obligatorio.");

  const { error } = await supabase
    .from("customer_installations")
    .update({
      site_id: input.siteId ?? null,
      name,
      work_description: input.workDescription?.trim() || null,
      status: input.status?.trim().toLowerCase() || "active",
    })
    .eq("id", input.installationId)
    .eq("company_id", companyId)
    .eq("customer_id", customerId);

  if (error) {
    throw new Error(error.message || "No se pudo actualizar la instalacion.");
  }
}

export async function deleteCustomerInstallation(
  companyId: string,
  customerId: string,
  installationId: string
): Promise<void> {
  const { error } = await supabase
    .from("customer_installations")
    .delete()
    .eq("id", installationId)
    .eq("company_id", companyId)
    .eq("customer_id", customerId);

  if (error) {
    throw new Error(error.message || "No se pudo eliminar la instalacion.");
  }
}
