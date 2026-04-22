import { supabase } from "../libs/supabase";
import { logAuditEvent } from "./audit.service";
import { sendEmailNotification } from "./email-notification.service";
import type { SurveyLayout } from "../types/siteSurveyExecution.types";

export interface InstallationProject {
  id: string;
  companyId: string;
  budgetId: string;
  siteId: string;
  responsibleUserId: string | null;
  status: "pendiente" | "en_progreso" | "terminado" | "cancelado";
  scope: string | null;
  phases: InstallationProjectPhase[];
  planLocked: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  technicalVisitId: string | null;
  technicalVisitStatus: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  technicianId: string | null;
  technicianName: string | null;
}

export interface InstallationProjectPhase {
  id: string;
  title: string;
  description: string | null;
  done: boolean;
  completedAt: string | null;
}

export interface InstallationProjectTask {
  id: string;
  companyId: string;
  projectId: string;
  code: string | null;
  title: string;
  description: string | null;
  status: "pendiente" | "en_progreso" | "completada" | "cancelada";
  assignedTechnicianId: string | null;
  assignedTechnicianName: string | null;
  dueAt: string | null;
  completedAt: string | null;
  position: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface InstallationInventoryConsumption {
  id: string;
  projectId: string;
  deviceId: string;
  deviceName: string | null;
  deviceModel: string | null;
  quantity: number;
  consumedAt: string | null;
  idempotencyKey: string | null;
}

export interface InstallationProjectBudgetItem {
  id: string;
  deviceId: string;
  deviceName: string | null;
  deviceModel: string | null;
  zoneId: string | null;
  zoneName: string | null;
  quantity: number;
}

export interface InstallationProjectPostInstallationCheck {
  id: string;
  text: string;
  itemOrder: number;
  checked: boolean;
  notes: string | null;
  checkedAt: string | null;
  checkedBy: string | null;
  checkedByName: string | null;
}

export interface InstallationProjectDetail extends InstallationProject {
  customerName: string | null;
  siteName: string | null;
  budgetStatus: string | null;
  surveyId: string | null;
  layout: SurveyLayout;
  budgetItems: InstallationProjectBudgetItem[];
  tasks: InstallationProjectTask[];
  postInstallationChecks: InstallationProjectPostInstallationCheck[];
  consumptions: InstallationInventoryConsumption[];
}

export interface InstallationProjectSummary extends InstallationProject {
  customerName: string | null;
  siteName: string | null;
  budgetStatus: string | null;
}

function safeText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function safeNullableText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return safeText(value, "");
}

function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function safeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function pickSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function normalizeLayout(value: unknown): SurveyLayout {
  if (value && typeof value === "object") {
    const root = value as Record<string, unknown>;
    return {
      walls: Array.isArray(root.walls) ? (root.walls as SurveyLayout["walls"]) : [],
      zones: Array.isArray(root.zones) ? (root.zones as SurveyLayout["zones"]) : [],
      devices: Array.isArray(root.devices) ? (root.devices as SurveyLayout["devices"]) : [],
    };
  }

  return { walls: [], zones: [], devices: [] };
}

function toPhases(value: unknown): InstallationProjectPhase[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (typeof item === "string") {
        const title = item.trim();
        if (!title) return null;
        return {
          id: `legacy-${index}`,
          title,
          description: null,
          done: false,
          completedAt: null,
        } satisfies InstallationProjectPhase;
      }

      const row = asRecord(item);
      const title = safeText(row.title).trim();
      if (!title) return null;

      return {
        id: safeText(row.id, `phase-${index}`),
        title,
        description: safeNullableText(row.description),
        done: safeBoolean(row.done),
        completedAt: safeNullableText(row.completedAt ?? row.completed_at),
      } satisfies InstallationProjectPhase;
    })
    .filter((phase): phase is InstallationProjectPhase => Boolean(phase));
}

function isValidEmail(value: string | null | undefined): value is string {
  if (!value) return false;
  const normalized = value.trim();
  return normalized.length > 3 && normalized.includes("@");
}

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message || "No se pudo validar la sesion.");

  let accessToken = data.session?.access_token ?? null;
  const expiresAt = data.session?.expires_at ?? null;
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (!accessToken || (typeof expiresAt === "number" && expiresAt <= nowSeconds + 30)) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      throw new Error(refreshError.message || "Sesion expirada. Vuelve a iniciar sesion.");
    }
    accessToken = refreshed.session?.access_token ?? null;
  }

  if (!accessToken) {
    throw new Error("Sesion expirada. Vuelve a iniciar sesion.");
  }

  return accessToken;
}

function formatDateTimeForEmail(value: string | null): string {
  if (!value) return "Sin fecha definida";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "Sin fecha definida";
  return new Intl.DateTimeFormat("es-DO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(parsed));
}

function getInstallationProjectUrl(projectId: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/admin/installation-projects/${projectId}`;
}

async function getProjectNotificationContext(projectId: string): Promise<{
  companyId: string | null;
  customerEmail: string | null;
  customerName: string | null;
  siteName: string | null;
} | null> {
  const { data, error } = await supabase
    .from("installation_projects")
    .select(
      `
      id,
      company_id,
      site_id,
      customer_sites:site_id ( id, name ),
      budgets:budget_id (
        id,
        site_surveys:survey_id (
          id,
          customer_id
        )
      )
    `
    )
    .eq("id", projectId)
    .maybeSingle();

  if (error || !data) return null;

  const budget = pickSingle(
    (data as { budgets?: Record<string, unknown> | Record<string, unknown>[] | null | undefined }).budgets
  );
  const survey = pickSingle(
    (budget as { site_surveys?: Record<string, unknown> | Record<string, unknown>[] | null | undefined } | null)
      ?.site_surveys
  );
  const site = pickSingle(
    (data as { customer_sites?: Record<string, unknown> | Record<string, unknown>[] | null | undefined })
      .customer_sites
  );
  let customerId = safeNullableText((survey as { customer_id?: unknown } | null)?.customer_id);

  if (!customerId) {
    const siteId = safeNullableText(data.site_id);
    if (siteId) {
      const { data: siteData } = await supabase
        .from("customer_sites")
        .select("customer_id")
        .eq("id", siteId)
        .maybeSingle<{ customer_id: string | null }>();
      customerId = siteData?.customer_id ?? null;
    }
  }

  if (!customerId) {
    return {
      companyId: safeNullableText(data.company_id),
      customerEmail: null,
      customerName: null,
      siteName: safeNullableText((site as { name?: unknown } | null)?.name),
    };
  }

  const { data: customerData } = await supabase
    .from("users")
    .select("email, name")
    .eq("id", customerId)
    .maybeSingle<{ email: string | null; name: string | null }>();

  return {
    companyId: safeNullableText(data.company_id),
    customerEmail: customerData?.email ?? null,
    customerName: customerData?.name ?? null,
    siteName: safeNullableText((site as { name?: unknown } | null)?.name),
  };
}

function mapProject(row: Record<string, unknown>): InstallationProject {
  const visitsRaw = row.technical_visits as unknown;
  const visit = pickSingle(visitsRaw as Record<string, unknown> | Record<string, unknown>[] | null | undefined);
  const technician = pickSingle(
    (visit as { users?: Record<string, unknown> | Record<string, unknown>[] | null | undefined } | null | undefined)
      ?.users as Record<string, unknown> | Record<string, unknown>[] | null | undefined
  );

  return {
    id: safeText(row.id),
    companyId: safeText(row.company_id),
    budgetId: safeText(row.budget_id),
    siteId: safeText(row.site_id),
    responsibleUserId: safeNullableText(row.responsible_user_id),
    status: (safeText(row.status, "pendiente") as InstallationProject["status"]) ?? "pendiente",
    scope: safeNullableText(row.scope),
    phases: toPhases(row.phases),
    planLocked: safeBoolean(row.plan_locked),
    createdAt: safeNullableText(row.created_at),
    updatedAt: safeNullableText(row.updated_at),
    completedAt: safeNullableText(row.completed_at),
    technicalVisitId: safeNullableText((visit as { id?: unknown } | null)?.id),
    technicalVisitStatus: safeNullableText((visit as { status?: unknown } | null)?.status),
    scheduledStart: safeNullableText((visit as { scheduled_start?: unknown } | null)?.scheduled_start),
    scheduledEnd: safeNullableText((visit as { scheduled_end?: unknown } | null)?.scheduled_end),
    technicianId: safeNullableText((visit as { technician_id?: unknown } | null)?.technician_id),
    technicianName: safeNullableText((technician as { name?: unknown } | null)?.name),
  };
}

function mapTask(row: Record<string, unknown>): InstallationProjectTask {
  const technician = pickSingle(
    (row.users as Record<string, unknown> | Record<string, unknown>[] | null | undefined) ?? null
  );

  return {
    id: safeText(row.id),
    companyId: safeText(row.company_id),
    projectId: safeText(row.project_id),
    code: safeNullableText(row.code),
    title: safeText(row.title, "Tarea"),
    description: safeNullableText(row.description),
    status: (safeText(row.status, "pendiente") as InstallationProjectTask["status"]) ?? "pendiente",
    assignedTechnicianId: safeNullableText(row.assigned_technician_id),
    assignedTechnicianName: safeNullableText((technician as { name?: unknown } | null)?.name),
    dueAt: safeNullableText(row.due_at),
    completedAt: safeNullableText(row.completed_at),
    position: safeNumber(row.position, 0),
    createdAt: safeNullableText(row.created_at),
    updatedAt: safeNullableText(row.updated_at),
  };
}

function mapConsumption(row: Record<string, unknown>): InstallationInventoryConsumption {
  const device = pickSingle(
    (row.devices as Record<string, unknown> | Record<string, unknown>[] | null | undefined) ?? null
  );

  return {
    id: safeText(row.id),
    projectId: safeText(row.project_id),
    deviceId: safeText(row.device_id),
    deviceName: safeNullableText((device as { name?: unknown } | null)?.name),
    deviceModel: safeNullableText((device as { model?: unknown } | null)?.model),
    quantity: Math.max(0, safeNumber(row.quantity, 0)),
    consumedAt: safeNullableText(row.consumed_at),
    idempotencyKey: safeNullableText(row.idempotency_key),
  };
}

export async function getInstallationProjectByBudget(
  budgetId: string,
  companyId: string
): Promise<InstallationProject | null> {
  const { data, error } = await supabase
    .from("installation_projects")
    .select(
      `
      id,
      company_id,
      budget_id,
      site_id,
      responsible_user_id,
      status,
      scope,
      phases,
      plan_locked,
      post_installation_checks_state,
      created_at,
      updated_at,
      completed_at,
      technical_visits (
        id,
        scheduled_start,
        scheduled_end,
        technician_id,
        status,
        users:technician_id ( id, name )
      )
    `
    )
    .eq("company_id", companyId)
    .eq("budget_id", budgetId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "No se pudo cargar el proyecto de instalacion.");
  }

  if (!data) return null;
  return mapProject(data as Record<string, unknown>);
}

export async function getInstallationProjectById(
  projectId: string,
  companyId: string
): Promise<InstallationProjectDetail> {
  const { data, error } = await supabase
    .from("installation_projects")
    .select(
      `
      id,
      company_id,
      budget_id,
      site_id,
      responsible_user_id,
      status,
      scope,
      phases,
      plan_locked,
      post_installation_checks_state,
      created_at,
      updated_at,
      completed_at,
      customer_sites:site_id ( id, name ),
      users:responsible_user_id ( id, name ),
      budgets:budget_id (
        id,
        status,
        survey_id,
        layout_json,
        budget_items (
          id,
          device_id,
          zone_id,
          quantity,
          devices:device_id ( id, name, model ),
          zones:zone_id ( id, name )
        ),
        site_surveys:survey_id (
          id,
          customer_id,
          customers:customer_id (
            user_id,
            users:users!customers_user_id_fkey ( id, name )
          )
        )
      ),
      technical_visits (
        id,
        scheduled_start,
        scheduled_end,
        technician_id,
        status,
        users:technician_id ( id, name )
      )
    `
    )
    .eq("id", projectId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message || "No se pudo cargar el proyecto de instalacion.");
  }

  const project = mapProject(data as Record<string, unknown>);

  const budget = pickSingle(
    (data as { budgets?: Record<string, unknown> | Record<string, unknown>[] | null | undefined }).budgets
  );

  const site = pickSingle(
    (data as { customer_sites?: Record<string, unknown> | Record<string, unknown>[] | null | undefined }).customer_sites
  );

  const survey = pickSingle(
    (budget as { site_surveys?: Record<string, unknown> | Record<string, unknown>[] | null | undefined } | null)
      ?.site_surveys
  );

  const customer = pickSingle(
    (survey as { customers?: Record<string, unknown> | Record<string, unknown>[] | null | undefined } | null)
      ?.customers
  );

  const customerUser = pickSingle(
    (customer as { users?: Record<string, unknown> | Record<string, unknown>[] | null | undefined } | null)?.users
  );

  const budgetItemsRaw = ((budget as { budget_items?: unknown[] | null } | null)?.budget_items ?? []) as Array<
    Record<string, unknown>
  >;

  const budgetItems: InstallationProjectBudgetItem[] = budgetItemsRaw.map((row) => {
    const device = pickSingle(
      (row.devices as Record<string, unknown> | Record<string, unknown>[] | null | undefined) ?? null
    );
    const zone = pickSingle((row.zones as Record<string, unknown> | Record<string, unknown>[] | null | undefined) ?? null);

    return {
      id: safeText(row.id),
      deviceId: safeText(row.device_id),
      deviceName: safeNullableText((device as { name?: unknown } | null)?.name),
      deviceModel: safeNullableText((device as { model?: unknown } | null)?.model),
      zoneId: safeNullableText(row.zone_id),
      zoneName: safeNullableText((zone as { name?: unknown } | null)?.name),
      quantity: Math.max(0, safeNumber(row.quantity, 0)),
    };
  });

  const [
    { data: tasksData, error: tasksError },
    { data: consData, error: consError },
    { data: postChecklistData, error: postChecklistError },
  ] =
    await Promise.all([
      supabase
        .from("installation_project_tasks")
        .select(
          "id, company_id, project_id, code, title, description, status, assigned_technician_id, due_at, completed_at, position, created_at, updated_at, users:assigned_technician_id ( id, name )"
        )
        .eq("project_id", projectId)
        .eq("company_id", companyId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("installation_project_inventory_consumption")
        .select(
          "id, project_id, device_id, quantity, consumed_at, idempotency_key, devices:device_id ( id, name, model )"
        )
        .eq("project_id", projectId)
        .eq("company_id", companyId)
        .order("consumed_at", { ascending: false }),
      supabase
        .from("post_installation_checks")
        .select(
          "id, post_installation_check_items ( id, text, item_order, is_active )"
        )
        .eq("company_id", companyId)
        .maybeSingle(),
    ]);

  if (tasksError) {
    throw new Error(tasksError.message || "No se pudieron cargar las tareas del proyecto.");
  }

  if (consError) {
    throw new Error(consError.message || "No se pudo cargar el consumo de inventario del proyecto.");
  }

  if (postChecklistError) {
    throw new Error(postChecklistError.message || "No se pudo cargar las pruebas post instalacion.");
  }

  const stateRaw = (data as { post_installation_checks_state?: unknown }).post_installation_checks_state;
  const stateByItemId = asRecord(stateRaw);

  const postItemsRaw = (postChecklistData as { post_installation_check_items?: unknown[] | null } | null)
    ?.post_installation_check_items;

  const postItems = (Array.isArray(postItemsRaw) ? postItemsRaw : [])
    .map((row) => row as Record<string, unknown>)
    .filter((row) => safeBoolean(row.is_active))
    .sort((a, b) => safeNumber(a.item_order, 0) - safeNumber(b.item_order, 0));

  const checkedByIds = Array.from(
    new Set(
      postItems
        .map((item) => {
          const state = asRecord(stateByItemId[safeText(item.id)]);
          return safeNullableText(state.checked_by);
        })
        .filter((value): value is string => Boolean(value))
    )
  );

  const checkedByNameById = new Map<string, string>();
  if (checkedByIds.length > 0) {
    const { data: checkedUsersData } = await supabase
      .from("users")
      .select("id, name")
      .in("id", checkedByIds)
      .returns<Array<{ id: string; name: string | null }>>();

    (checkedUsersData ?? []).forEach((user) => {
      checkedByNameById.set(user.id, user.name ?? user.id);
    });
  }

  const postInstallationChecks: InstallationProjectPostInstallationCheck[] = postItems.map((item) => {
    const itemId = safeText(item.id);
    const state = asRecord(stateByItemId[itemId]);
    const checkedBy = safeNullableText(state.checked_by);

    return {
      id: itemId,
      text: safeText(item.text, "Item"),
      itemOrder: safeNumber(item.item_order, 0),
      checked: safeBoolean(state.checked),
      notes: safeNullableText(state.notes),
      checkedAt: safeNullableText(state.checked_at),
      checkedBy,
      checkedByName: checkedBy ? checkedByNameById.get(checkedBy) ?? null : null,
    };
  });

  return {
    ...project,
    customerName: safeNullableText((customerUser as { name?: unknown } | null)?.name),
    siteName: safeNullableText((site as { name?: unknown } | null)?.name),
    budgetStatus: safeNullableText((budget as { status?: unknown } | null)?.status),
    surveyId: safeNullableText((budget as { survey_id?: unknown } | null)?.survey_id),
    layout: normalizeLayout((budget as { layout_json?: unknown } | null)?.layout_json),
    budgetItems,
    tasks: (tasksData ?? []).map((row) => mapTask(row as Record<string, unknown>)),
    postInstallationChecks,
    consumptions: (consData ?? []).map((row) => mapConsumption(row as Record<string, unknown>)),
  };
}

export async function createInstallationProject(input: {
  companyId: string;
  budgetId: string;
}): Promise<{ projectId: string; technicalVisitId: string | null; created: boolean }> {
  const { data, error } = await supabase
    .rpc("create_installation_project", {
      p_company_id: input.companyId,
      p_budget_id: input.budgetId,
      p_technician_id: null,
      p_scheduled_start: null,
      p_scheduled_end: null,
    })
    .single<{ project_id: string; technical_visit_id: string | null; created: boolean }>();

  if (error || !data) {
    throw new Error(error?.message || "No se pudo crear el proyecto de instalacion.");
  }

  if (data.project_id) {
    try {
      await seedInstallationProjectDefaults({
        companyId: input.companyId,
        projectId: data.project_id,
      });
    } catch (seedError) {
      console.error("[installation.service] seed_installation_project_defaults_error", seedError);
    }
  }

  await logAuditEvent({
    action: data.created ? "create" : "read",
    entity: "installation_projects",
    entityId: data.project_id,
    companyId: input.companyId,
    newValues: {
      budgetId: input.budgetId,
      technicalVisitId: data.technical_visit_id,
      created: data.created,
    },
  });

  return {
    projectId: safeText(data.project_id),
    technicalVisitId: safeNullableText(data.technical_visit_id),
    created: Boolean(data.created),
  };
}

export async function seedInstallationProjectDefaults(input: {
  companyId: string;
  projectId: string;
}): Promise<void> {
  const { error } = await supabase.rpc("seed_installation_project_defaults", {
    p_company_id: input.companyId,
    p_project_id: input.projectId,
  });

  if (error) {
    throw new Error(error.message || "No se pudo inicializar tareas/checklist del proyecto.");
  }
}

export async function upsertInstallationProjectVisit(input: {
  companyId: string;
  projectId: string;
  technicianId: string;
  scheduledStart: string;
  scheduledEnd: string | null;
}): Promise<{ technicalVisitId: string; created: boolean; visitStatus: string }> {
  const { data, error } = await supabase
    .rpc("upsert_installation_project_visit", {
      p_company_id: input.companyId,
      p_project_id: input.projectId,
      p_technician_id: input.technicianId,
      p_scheduled_start: input.scheduledStart,
      p_scheduled_end: input.scheduledEnd,
    })
    .single<{ technical_visit_id: string; created: boolean; visit_status: string }>();

  if (error || !data?.technical_visit_id) {
    throw new Error(error?.message || "No se pudo programar la visita tecnica del proyecto.");
  }

  await logAuditEvent({
    action: data.created ? "create" : "update",
    entity: "technical_visits",
    entityId: data.technical_visit_id,
    companyId: input.companyId,
    newValues: {
      projectId: input.projectId,
      technicianId: input.technicianId,
      scheduledStart: input.scheduledStart,
      scheduledEnd: input.scheduledEnd,
      status: data.visit_status,
    },
  });

  const context = await getProjectNotificationContext(input.projectId);
  if (context && isValidEmail(context.customerEmail)) {
    const isCreated = Boolean(data.created);
    void sendEmailNotification({
      companyId: context.companyId ?? undefined,
      to: context.customerEmail,
      type: "transaction",
      eventKey: isCreated ? "visit.scheduled" : "visit.rescheduled",
      templateKey: isCreated ? "visit_scheduled" : "visit_rescheduled",
      entityType: "technical_visit",
      entityId: data.technical_visit_id,
      title: isCreated ? "Visita de instalacion programada" : "Visita de instalacion reprogramada",
      message: isCreated
        ? `Hola ${context.customerName ?? "cliente"}, programamos la visita de instalacion para ${formatDateTimeForEmail(
            input.scheduledStart
          )}.`
        : `Hola ${context.customerName ?? "cliente"}, reprogramamos la visita de instalacion para ${formatDateTimeForEmail(
            input.scheduledStart
          )}.`,
      actionUrl: getInstallationProjectUrl(input.projectId),
      metadata: {
        projectId: input.projectId,
        technicalVisitId: data.technical_visit_id,
        sitio: context.siteName ?? "No definido",
        inicio: input.scheduledStart,
        fin: input.scheduledEnd,
      },
    }).catch((notifyError) => {
      console.error("[installation.service] installation_visit_email_error", notifyError);
    });
  }

  return {
    technicalVisitId: safeText(data.technical_visit_id),
    created: Boolean(data.created),
    visitStatus: safeText(data.visit_status, "programada"),
  };
}

export async function createInstallationProjectTask(input: {
  companyId: string;
  projectId: string;
  title: string;
}): Promise<void> {
  const cleanTitle = input.title.trim();
  if (!cleanTitle) {
    throw new Error("El titulo de la tarea es requerido.");
  }

  const { data: maxPositionData } = await supabase
    .from("installation_project_tasks")
    .select("position")
    .eq("company_id", input.companyId)
    .eq("project_id", input.projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number | null }>();

  const nextPosition = (maxPositionData?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("installation_project_tasks")
    .insert({
      company_id: input.companyId,
      project_id: input.projectId,
      title: cleanTitle,
      status: "pendiente",
      position: nextPosition,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data?.id) {
    throw new Error(error?.message || "No se pudo crear la tarea.");
  }

  await logAuditEvent({
    action: "create",
    entity: "installation_project_tasks",
    entityId: data.id,
    companyId: input.companyId,
    newValues: {
      title: cleanTitle,
      status: "pendiente",
      position: nextPosition,
    },
  });
}

export async function updateInstallationProjectTask(input: {
  taskId: string;
  companyId: string;
  patch: {
    title?: string;
    description?: string | null;
    status?: InstallationProjectTask["status"];
    assignedTechnicianId?: string | null;
    dueAt?: string | null;
    position?: number;
  };
}): Promise<void> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.patch.title !== undefined) payload.title = input.patch.title;
  if (input.patch.description !== undefined) payload.description = input.patch.description;
  if (input.patch.status !== undefined) payload.status = input.patch.status;
  if (input.patch.assignedTechnicianId !== undefined) {
    payload.assigned_technician_id = input.patch.assignedTechnicianId;
  }
  if (input.patch.dueAt !== undefined) payload.due_at = input.patch.dueAt;
  if (input.patch.position !== undefined) payload.position = input.patch.position;

  if (input.patch.status !== undefined) {
    if (input.patch.status === "completada") {
      payload.completed_at = new Date().toISOString();
    } else {
      payload.completed_at = null;
    }
  }

  const { error } = await supabase
    .from("installation_project_tasks")
    .update(payload)
    .eq("id", input.taskId)
    .eq("company_id", input.companyId);

  if (error) {
    throw new Error(error.message || "No se pudo actualizar la tarea del proyecto.");
  }

  await logAuditEvent({
    action: "update",
    entity: "installation_project_tasks",
    entityId: input.taskId,
    companyId: input.companyId,
    newValues: payload,
  });
}

export async function updateInstallationProjectPostInstallationCheck(input: {
  companyId: string;
  projectId: string;
  itemId: string;
  checked: boolean;
  notes?: string | null;
  userId: string;
}): Promise<void> {
  const { error } = await supabase.rpc("upsert_project_post_installation_check_state", {
    p_company_id: input.companyId,
    p_project_id: input.projectId,
    p_item_id: input.itemId,
    p_checked: input.checked,
    p_notes: input.notes ?? null,
    p_user_id: input.userId,
  });

  if (error) {
    throw new Error(error.message || "No se pudo actualizar la prueba post instalacion.");
  }

  await logAuditEvent({
    action: "update",
    entity: "installation_projects",
    entityId: input.projectId,
    companyId: input.companyId,
    userId: input.userId,
    newValues: {
      postInstallationItemId: input.itemId,
      checked: input.checked,
      notes: input.notes ?? null,
    },
  });
}

export async function updateInstallationProjectMetadata(input: {
  projectId: string;
  companyId: string;
  scope?: string | null;
  phases?: InstallationProjectPhase[];
  lockPlan?: boolean;
}): Promise<void> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.scope !== undefined) payload.scope = input.scope;
  if (input.lockPlan !== undefined) payload.plan_locked = input.lockPlan;
  if (input.phases !== undefined) {
    payload.phases = input.phases.map((phase, index) => ({
      id: phase.id || `phase-${index}`,
      title: phase.title,
      description: phase.description ?? null,
      done: Boolean(phase.done),
      completedAt: phase.done ? phase.completedAt ?? new Date().toISOString() : null,
    }));
  }

  const { error } = await supabase
    .from("installation_projects")
    .update(payload)
    .eq("id", input.projectId)
    .eq("company_id", input.companyId);

  if (error) {
    throw new Error(error.message || "No se pudo guardar los datos del proyecto.");
  }
}

export async function finalizeInstallationProject(input: {
  companyId: string;
  projectId: string;
  userId: string;
}): Promise<{ alreadyFinalized: boolean; inventoryConsumed: boolean; paymentAccountId: string | null }> {
  const { data, error } = await supabase
    .rpc("finalize_installation_project", {
      p_company_id: input.companyId,
      p_project_id: input.projectId,
      p_user_id: input.userId,
    })
    .single<{ project_id: string; already_finalized: boolean; inventory_consumed: boolean }>();

  if (error || !data?.project_id) {
    throw new Error(error?.message || "No se pudo finalizar el proyecto.");
  }

  await logAuditEvent({
    action: "complete",
    entity: "installation_projects",
    entityId: data.project_id,
    companyId: input.companyId,
    userId: input.userId,
    newValues: {
      status: "terminado",
      alreadyFinalized: Boolean(data.already_finalized),
      inventoryConsumed: Boolean(data.inventory_consumed),
    },
  });

  let paymentAccountId: string | null = null;

  try {
    const { data: ensuredPayment, error: paymentError } = await supabase
      .rpc("ensure_payment_account_for_project", {
        p_project_id: input.projectId,
        p_created_by: input.userId,
      })
      .single<{ account_id: string; delivery_act_id: string; created: boolean }>();

    if (paymentError) {
      throw new Error(paymentError.message || "No se pudo generar el pago del proyecto.");
    }

    paymentAccountId = safeNullableText(ensuredPayment?.account_id);

    if (paymentAccountId) {
      const accessToken = await getAccessToken();
      const { data: invoiceResult, error: invoiceError } = await supabase.functions.invoke<{
        accountId?: string;
        error?: string;
      }>("payments_actions", {
        body: {
          mode: "issue_account_invoice",
          accountId: paymentAccountId,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (invoiceError) {
        throw new Error(invoiceError.message || "No se pudo emitir la factura del pago.");
      }

      if (invoiceResult?.error) {
        throw new Error(invoiceResult.error);
      }
    }
  } catch (paymentFlowError) {
    console.error("[installation.service] finalize_payment_flow_error", paymentFlowError);
  }

  return {
    alreadyFinalized: Boolean(data.already_finalized),
    inventoryConsumed: Boolean(data.inventory_consumed),
    paymentAccountId,
  };
}

export async function listInstallationProjectsByCustomer(
  companyId: string,
  customerId: string
): Promise<InstallationProject[]> {
  const { data, error } = await supabase
    .from("installation_projects")
    .select(
      `
      id,
      company_id,
      budget_id,
      site_id,
      responsible_user_id,
      status,
      scope,
      phases,
      plan_locked,
      created_at,
      updated_at,
      completed_at,
      budgets:budget_id!inner (
        id,
        survey_id,
        site_surveys:survey_id!inner ( customer_id )
      ),
      technical_visits (
        id,
        scheduled_start,
        scheduled_end,
        technician_id,
        status,
        users:technician_id ( id, name )
      )
    `
    )
    .eq("company_id", companyId)
    .eq("budgets.site_surveys.customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "No se pudieron cargar los proyectos del cliente.");
  }

  return (data ?? []).map((row) => mapProject(row as Record<string, unknown>));
}

export async function listInstallationProjects(companyId: string): Promise<InstallationProjectSummary[]> {
  const { data, error } = await supabase
    .from("installation_projects")
    .select(
      `
      id,
      company_id,
      budget_id,
      site_id,
      responsible_user_id,
      status,
      scope,
      phases,
      plan_locked,
      created_at,
      updated_at,
      completed_at,
      customer_sites:site_id ( id, name ),
      budgets:budget_id (
        id,
        status,
        survey_id,
        site_surveys:survey_id (
          id,
          customer_id,
          customers:customer_id (
            user_id,
            users:users!customers_user_id_fkey ( id, name )
          )
        )
      ),
      technical_visits (
        id,
        scheduled_start,
        scheduled_end,
        technician_id,
        status,
        users:technician_id ( id, name )
      )
    `
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "No se pudieron cargar los proyectos.");
  }

  return (data ?? []).map((row) => {
    const project = mapProject(row as Record<string, unknown>);
    const site = pickSingle(
      (row as { customer_sites?: Record<string, unknown> | Record<string, unknown>[] | null | undefined }).customer_sites
    );
    const budget = pickSingle(
      (row as { budgets?: Record<string, unknown> | Record<string, unknown>[] | null | undefined }).budgets
    );
    const survey = pickSingle(
      (budget as { site_surveys?: Record<string, unknown> | Record<string, unknown>[] | null | undefined } | null)
        ?.site_surveys
    );
    const customer = pickSingle(
      (survey as { customers?: Record<string, unknown> | Record<string, unknown>[] | null | undefined } | null)
        ?.customers
    );
    const customerUser = pickSingle(
      (customer as { users?: Record<string, unknown> | Record<string, unknown>[] | null | undefined } | null)?.users
    );

    return {
      ...project,
      customerName: safeNullableText((customerUser as { name?: unknown } | null)?.name),
      siteName: safeNullableText((site as { name?: unknown } | null)?.name),
      budgetStatus: safeNullableText((budget as { status?: unknown } | null)?.status),
    } satisfies InstallationProjectSummary;
  });
}
