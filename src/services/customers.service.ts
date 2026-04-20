import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../libs/supabase";
import { logAuditEvent } from "./audit.service";
import {
  createCustomerViaInvitation,
} from "./customerInvitations.service";
import { toPlanAwareErrorMessage } from "../utils/planLimits";
import type {
  Customer,
  CustomerInput,
  CustomersQuery,
  CustomersResult,
} from "../types/customer.types";

let cachedCustomerRoleId: string | null = null;

function buildErrorMessage(error: PostgrestError | null, fallback: string): string {
  if (!error) return fallback;

  if (error.code === "P0001") {
    return toPlanAwareErrorMessage(error, fallback);
  }

  if (error.code === "23505") {
    return "Ya existe un cliente con ese documento fiscal en esta compania.";
  }

  if (error.code === "23503") {
    return "Relacion invalida: verifica que el usuario exista en Auth y que la compania/rol sean validos.";
  }

  return error.message || fallback;
}

function sanitizeSearch(value: string): string {
  return value.replace(/[(),]/g, " ").trim();
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

function mapCustomers(
  companyId: string,
  users: Array<{ id: string; name: string; id_card: string | null }>,
  customers: Array<{
    user_id: string;
    phone: string | null;
    tax_id: string;
    type: Customer["type"];
    created_at: string | null;
  }>
): Customer[] {
  const usersById = new Map(users.map((user) => [user.id, user]));

  return customers
    .map((customer) => {
      const user = usersById.get(customer.user_id);
      if (!user) return null;

      return {
        id: customer.user_id,
        companyId,
        name: user.name,
        idCard: user.id_card,
        phone: customer.phone,
        taxId: customer.tax_id,
        type: customer.type,
        createdAt: customer.created_at ?? new Date().toISOString(),
      } satisfies Customer;
    })
    .filter((item): item is Customer => Boolean(item));
}

export async function listCustomers(
  companyId: string,
  query: CustomersQuery
): Promise<CustomersResult> {
  const customerRoleId = await getCustomerRoleId();

  const { data: roleRows, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("role_id", customerRoleId)
    .returns<Array<{ user_id: string | null }>>();

  if (rolesError) {
    throw new Error(buildErrorMessage(rolesError, "No se pudo cargar la lista de clientes."));
  }

  const userIds = (roleRows ?? [])
    .map((row) => row.user_id)
    .filter((value): value is string => Boolean(value));

  if (userIds.length === 0) {
    return { items: [], total: 0 };
  }

  const [customersResponse, usersResponse] = await Promise.all([
    supabase
      .from("customers")
      .select("user_id, phone, tax_id, type, created_at")
      .in("user_id", userIds)
      .returns<
        Array<{
          user_id: string;
          phone: string | null;
          tax_id: string;
          type: Customer["type"];
          created_at: string | null;
        }>
      >(),
    supabase
      .from("users")
      .select("id, name, id_card")
      .in("id", userIds)
      .returns<Array<{ id: string; name: string; id_card: string | null }>>(),
  ]);

  if (customersResponse.error) {
    throw new Error(buildErrorMessage(customersResponse.error, "No se pudo cargar la lista de clientes."));
  }

  if (usersResponse.error) {
    throw new Error(buildErrorMessage(usersResponse.error, "No se pudo cargar la lista de clientes."));
  }

  let mapped = mapCustomers(companyId, usersResponse.data ?? [], customersResponse.data ?? []);

  if (query.type) {
    mapped = mapped.filter((item) => item.type === query.type);
  }

  const safeSearch = query.search ? sanitizeSearch(query.search).toLowerCase() : "";
  if (safeSearch) {
    mapped = mapped.filter((item) => {
      const searchable = [
        item.name,
        item.idCard ?? "",
        item.phone ?? "",
        item.taxId,
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(safeSearch);
    });
  }

  mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const from = (query.page - 1) * query.pageSize;
  const paginated = mapped.slice(from, from + query.pageSize);

  return {
    items: paginated,
    total: mapped.length,
  };
}

export async function createCustomer(companyId: string, input: CustomerInput): Promise<Customer> {
  const customerRoleId = await getCustomerRoleId();

  const { data: userRow, error: userError } = await supabase
    .from("users")
    .insert({
      name: input.name,
      id_card: input.idCard,
    })
    .select("id, name, id_card")
    .single<{ id: string; name: string; id_card: string | null }>();

  if (userError || !userRow) {
    throw new Error(buildErrorMessage(userError, "No se pudo crear el perfil del cliente."));
  }

  const userId = userRow.id;

  const { data: customerRow, error: customerError } = await supabase
    .from("customers")
    .insert({
      user_id: userId,
      phone: input.phone,
      tax_id: input.taxId,
      type: input.type,
    })
    .select("user_id, phone, tax_id, type, created_at")
    .single<{
      user_id: string;
      phone: string | null;
      tax_id: string;
      type: Customer["type"];
      created_at: string | null;
    }>();

  if (customerError || !customerRow) {
    await supabase.from("users").delete().eq("id", userId);
    throw new Error(buildErrorMessage(customerError, "No se pudo crear el registro de cliente."));
  }

  const { error: roleError } = await supabase.from("user_roles").insert({
    user_id: userId,
    role_id: customerRoleId,
    company_id: companyId,
  });

  if (roleError) {
    await supabase.from("users").delete().eq("id", userId);
    throw new Error(buildErrorMessage(roleError, "No se pudo asignar el rol customer."));
  }

  await logAuditEvent({
    action: "create",
    entity: "customers",
    entityId: userId,
    companyId,
    newValues: {
      name: userRow.name,
      idCard: userRow.id_card,
      phone: customerRow.phone,
      taxId: customerRow.tax_id,
      type: customerRow.type,
    },
  });
  await logAuditEvent({
    action: "create",
    entity: "user_roles",
    entityId: userId,
    companyId,
    newValues: { roleId: customerRoleId },
  });

  return {
    id: userId,
    companyId,
    name: userRow.name,
    idCard: userRow.id_card,
    phone: customerRow.phone,
    taxId: customerRow.tax_id,
    type: customerRow.type,
    createdAt: customerRow.created_at ?? new Date().toISOString(),
  };
}

export async function createCustomerWithInvitation(
  companyId: string,
  input: CustomerInput,
  invitation: {
    invitationEmail: string;
    invitedByUserId: string;
    appBaseUrl: string;
  }
): Promise<Customer> {
  const created = await createCustomerViaInvitation({
    companyId,
    invitedByUserId: invitation.invitedByUserId,
    appBaseUrl: invitation.appBaseUrl,
    invitationEmail: invitation.invitationEmail,
    customerName: input.name,
    customerIdCard: input.idCard,
    customerType: input.type,
    customerTaxId: input.taxId,
    customerPhone: input.phone,
  });
  await logAuditEvent({
    action: "create",
    entity: "customers",
    entityId: created.id,
    companyId,
    newValues: {
      name: created.name,
      idCard: created.idCard,
      phone: created.phone,
      taxId: created.taxId,
      type: created.type,
    },
  });
  return created;
}

export async function updateCustomer(
  companyId: string,
  customerId: string,
  input: CustomerInput
): Promise<Customer> {
  const customerRoleId = await getCustomerRoleId();

  const { error: userUpdateError } = await supabase
    .from("users")
    .update({
      name: input.name,
      id_card: input.idCard,
    })
    .eq("id", customerId);

  if (userUpdateError) {
    throw new Error(buildErrorMessage(userUpdateError, "No se pudo actualizar el perfil del cliente."));
  }

  const { data: customerData, error: customerUpdateError } = await supabase
    .from("customers")
    .update({
      phone: input.phone,
      tax_id: input.taxId,
      type: input.type,
    })
    .eq("user_id", customerId)
    .select("user_id, phone, tax_id, type, created_at")
    .single<{
      user_id: string;
      phone: string | null;
      tax_id: string;
      type: Customer["type"];
      created_at: string | null;
    }>();

  if (customerUpdateError || !customerData) {
    throw new Error(buildErrorMessage(customerUpdateError, "No se pudo actualizar los datos del cliente."));
  }

  const { data: existingRole, error: roleCheckError } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", customerId)
    .eq("company_id", companyId)
    .eq("role_id", customerRoleId)
    .maybeSingle<{ id: string }>();

  if (roleCheckError) {
    throw new Error(buildErrorMessage(roleCheckError, "No se pudo validar el rol customer."));
  }

  if (!existingRole?.id) {
    const { error: roleInsertError } = await supabase.from("user_roles").insert({
      user_id: customerId,
      role_id: customerRoleId,
      company_id: companyId,
    });

    if (roleInsertError) {
      throw new Error(buildErrorMessage(roleInsertError, "No se pudo asegurar el rol customer."));
    }
    await logAuditEvent({
      action: "create",
      entity: "user_roles",
      entityId: customerId,
      companyId,
      newValues: { roleId: customerRoleId },
    });
  }

  const { data: userRow, error: userFetchError } = await supabase
    .from("users")
    .select("id, name, id_card")
    .eq("id", customerId)
    .single<{ id: string; name: string; id_card: string | null }>();

  if (userFetchError || !userRow) {
    throw new Error(buildErrorMessage(userFetchError, "No se pudo cargar el cliente actualizado."));
  }

  await logAuditEvent({
    action: "update",
    entity: "customers",
    entityId: customerId,
    companyId,
    newValues: {
      name: userRow.name,
      idCard: userRow.id_card,
      phone: customerData.phone,
      taxId: customerData.tax_id,
      type: customerData.type,
    },
  });

  return {
    id: customerId,
    companyId,
    name: userRow.name,
    idCard: userRow.id_card,
    phone: customerData.phone,
    taxId: customerData.tax_id,
    type: customerData.type,
    createdAt: customerData.created_at ?? new Date().toISOString(),
  };
}

export async function deleteCustomer(companyId: string, customerId: string): Promise<void> {
  const { error: relationError } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", customerId)
    .eq("company_id", companyId)
    .maybeSingle<{ id: string }>();

  if (relationError) {
    throw new Error(buildErrorMessage(relationError, "No se pudo validar la compania del cliente."));
  }

  const { error } = await supabase.from("users").delete().eq("id", customerId);

  if (error) {
    throw new Error(buildErrorMessage(error, "No se pudo eliminar el cliente."));
  }
  await logAuditEvent({
    action: "delete",
    entity: "customers",
    entityId: customerId,
    companyId,
  });
}
