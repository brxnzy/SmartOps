# Sistema de Soporte Técnico (Admin ↔ SuperAdmin) con Supabase

Implementación alineada al estilo del proyecto: **React + Supabase (DB + RLS + RPC + Edge Functions)**.

Objetivos:
- Admin (tenant) crea solicitudes y conversa con SuperAdmin por solicitud (chat).
- SuperAdmin ve todo (multi‑tenant), filtra, responde y cambia estado.
- Notificaciones por correo vía Edge Function `send_email_notification`.
- Impersonation “modo soporte” **sin romper el aislamiento** (sesión con expiración + auditoría).

---

## 1) Tablas (DB)

### 1.1 `support_requests`
- `id uuid pk default gen_random_uuid()`
- `company_id uuid not null references companies(id)`
- `created_by uuid not null references users(id)`
- `type text not null` (bug/help/emergency)
- `priority text not null` (low/medium/high/critical)
- `status text not null default 'open'` (open/in_progress/closed)
- `title text not null`
- `description text not null`
- `assigned_superadmin uuid null references users(id)`
- `last_activity_at timestamptz not null default now()`
- `closed_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### 1.2 `support_messages`
- `id uuid pk default gen_random_uuid()`
- `request_id uuid not null references support_requests(id) on delete cascade`
- `company_id uuid not null references companies(id)` (denormalizado para RLS/queries)
- `author_id uuid not null references users(id)`
- `author_kind text not null` (admin/superadmin/system)
- `body text not null`
- `is_internal boolean not null default false`
- `created_at timestamptz not null default now()`

Trigger recomendado:
- al insertar `support_messages` → actualizar `support_requests.last_activity_at = now()`.

### 1.3 `support_impersonation_sessions`
Sesión de “modo soporte” por SuperAdmin (expira).

- `id uuid pk default gen_random_uuid()`
- `superadmin_id uuid not null references users(id)`
- `company_id uuid not null references companies(id)`
- `impersonated_user_id uuid not null references users(id)`
- `expires_at timestamptz not null`
- `revoked_at timestamptz null`
- `ended_at timestamptz null`
- `created_at timestamptz not null default now()`

Restricción sugerida:
- 1 sesión activa por superadmin (`unique` parcial sobre `superadmin_id` donde `revoked_at is null and ended_at is null and expires_at > now()`).

---

## 2) RLS (aislamiento multi‑tenant)

Principios:
- Admin solo ve `company_id = su company`.
- SuperAdmin puede ver todas las solicitudes **solo** en el módulo global.
- El modo impersonation debe habilitar acceso controlado y auditable a un tenant, **sin mezclar datos**.

Helpers (funciones SQL, `security definer`, `row_security=off`):
- `is_superadmin()` → true si el usuario tiene role “superadmin”.
- `is_company_member(p_company_id)` → true si el usuario pertenece a esa compañía y su rol no es “customer”.
- `has_active_impersonation(p_company_id)` → true si existe sesión activa para `auth.uid()` en ese `company_id`.

Políticas mínimas (para el módulo de soporte):
- `support_requests`:
  - SELECT: `is_superadmin() OR is_company_member(company_id)`
  - INSERT: `is_company_member(company_id) OR is_superadmin()`
  - UPDATE (estado/assign): `is_superadmin()`
- `support_messages`:
  - SELECT: `is_superadmin() OR is_company_member(company_id)`
  - INSERT: `is_superadmin() OR is_company_member(company_id)`

Impersonation (incremental):
- Para permitir “diagnóstico” dentro de tenant, se agregan ORs en políticas de tablas del tenant:
  - `... OR has_active_impersonation(company_id)`
  - Inicialmente recomendado **read‑only** en las tablas críticas.

---

## 3) RPC (Supabase)

### 3.1 Inbox SuperAdmin
- `get_superadmin_support_requests(p_status text, p_priority text, p_company_id uuid, p_search text)`
  - Devuelve lista con `company_name`, counts, y sorting por `last_activity_at`.

### 3.2 Detalle de solicitud
- `get_support_request_detail(p_request_id uuid)`
  - Devuelve solicitud + mensajes (o solo solicitud y mensajes por endpoint separado).

### 3.3 Cambio de estado (SuperAdmin)
- `set_support_request_status(p_request_id uuid, p_status text)`
  - Valida superadmin y actualiza `closed_at` cuando aplique.

### 3.4 Impersonation (SuperAdmin)
- `start_support_impersonation(p_company_id uuid, p_user_id uuid, p_ttl_minutes int)`
- `stop_support_impersonation()`
- `get_active_support_impersonation()`

---

## 4) Notificaciones por correo (Edge Functions)

El proyecto ya usa `supabase.functions.invoke("send_email_notification")`.

Eventos mínimos:
- al crear solicitud:
  - email a “grupo superadmin”
- al nuevo mensaje:
  - email al “otro lado”

Recomendación práctica:
- en esta primera versión, disparar emails desde el **frontend services** justo después del insert exitoso.
- en versión robusta: mover a trigger + Edge Function (o job) para no depender del cliente.

---

## 5) UI/UX (estructura en el proyecto)

Admin:
- `/admin/support`: listado + botón “Nueva solicitud”
- `/admin/support/:requestId`: detalle + chat

SuperAdmin:
- `/superadmin/support`: inbox global con filtros (estado/prioridad/tenant)
- `/superadmin/support/:requestId`: detalle + chat + cambio de estado + botón “Modo soporte”

Indicador “modo soporte”:
- banner fijo visible en todas las pantallas cuando exista sesión activa.
- botón “Salir del modo soporte”.

