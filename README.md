# SmartOps

## Nombre del Proyecto
**SmartOps**

## Descripción del Proyecto
SmartOps es un sistema web para la gestión operativa de empresas de instalación/servicio: administración de clientes, usuarios/roles/permisos, inventario/dispositivos, levantamientos técnicos (site survey), calendarios/agenda, tickets, presupuestos/cotizaciones, proyectos de instalación y generación de documentos (actas y cotizaciones en PDF).

## Tecnologías Utilizadas
- **Frontend:** React + TypeScript + Vite
- **UI/Estilos:** Tailwind CSS, Lucide (iconos)
- **Navegación:** React Router
- **Calendario:** FullCalendar
- **Canvas/diagramas:** React Konva
- **Backend (BaaS):** Supabase (Auth, Postgres, Storage, Edge Functions)
- **Calidad:** ESLint

## Características del Sistema
- Autenticación y gestión de sesión con Supabase Auth (login, registro, verificación, reset/update password).
- Módulo **Admin**: dashboard, compañías, clientes, usuarios, roles/permisos, proveedores, dispositivos e inventario.
- **Levantamientos técnicos / visitas** con calendario y carga de evidencias (Storage).
- **Tickets** (creación, detalle, comentarios, adjuntos, SLA, notificaciones).
- **Presupuestos** y **cotización formal** con generación de PDF (Edge Function) y almacenamiento (Storage).
- **Proyectos de instalación** y **Acta de entrega** con generación/firmado (Edge Functions + Storage).
- Historial de correos y notificaciones por email (Edge Function + SMTP).
- Auditoría de acciones relevantes (logs).

## Requisitos del Sistema
- **Node.js**: 18+ (recomendado 20+)
- **npm**: 9+ (o el que incluya tu Node LTS)
- **Supabase** (cloud o local), con:
  - Base de datos Postgres + políticas RLS según el esquema del proyecto
  - Storage buckets (ver "Credenciales y recursos relevantes")
  - Edge Functions desplegadas (ver "API utilizada")

## Instalación del Proyecto
### Clone de repositorio de GitHub
```bash
git clone https://github.com/brxnzy/SmartOps.git
cd SmartOps
```

### Instalación de dependencias
```bash
npm install
```

## Configuración
### Variables de entorno (Frontend)
Crea un archivo `.env` (o `.env.local`) en la raíz del proyecto con:
```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Opcionales (si necesitas sobre-escribir el endpoint por ambiente)
VITE_SUPABASE_EMAIL_INVITATION_URL=
VITE_SUPABASE_USER_STATUS_URL=
```

**Dónde obtener los valores**
- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`: Supabase Dashboard → Project Settings → API.
- Las URLs opcionales, si se usan, deben apuntar a:
  - `.../functions/v1/email_invitation`
  - `.../functions/v1/user_status`

> Importante: no se deben commitear llaves/secretos. El repo ignora `.env` por defecto.

### Configuración (Supabase Edge Functions)
Este repo incluye funciones en `supabase/functions/*`. Para que funcionen en tu proyecto Supabase debes:
1. Instalar Supabase CLI y autenticarte.
2. Linkear el proyecto.
3. Configurar secrets.
4. Desplegar las funciones.

Ejemplo (guía general):
```bash
supabase login
supabase link --project-ref <TU_PROJECT_REF>
supabase secrets set SUPABASE_URL="<TU_SUPABASE_URL>"
supabase secrets set SUPABASE_ANON_KEY="<TU_ANON_KEY>"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<TU_SERVICE_ROLE_KEY>"
supabase functions deploy email_invitation
supabase functions deploy user_status
supabase functions deploy send_email_notification
supabase functions deploy quote_formal
supabase functions deploy generate-delivery-act-v3
supabase functions deploy sign-delivery-act
```

Secrets para correo (si usas notificaciones):
```bash
supabase secrets set GMAIL_SMTP_USER="<correo@gmail.com>"
supabase secrets set GMAIL_SMTP_APP_PASSWORD="<app_password>"
supabase secrets set MAIL_SENDER_NAME="SmartOps"
supabase secrets set MAIL_SENDER_EMAIL="<correo_remitente>"
```

### Migraciones / SQL
En `migrations/supabase_plan_upgrade_all_in_one.sql` hay un script para cambios de planes/límites. Ejecuta este SQL en tu base de datos Supabase (SQL Editor) cuando aplique al ambiente.

## Paso de ejecución del proyecto (paso a paso)
1. Clonar el repo: `git clone ...`
2. Instalar dependencias: `npm install`
3. Crear `.env` / `.env.local` con las variables `VITE_*`
4. (Si aplica) Configurar Supabase: buckets, funciones y secrets
5. Iniciar el proyecto:
   ```bash
   npm run dev
   ```
6. Abrir en el navegador la URL que muestre Vite (por defecto `http://localhost:5173`)

Comandos útiles:
- Build: `npm run build`
- Preview: `npm run preview`
- Lint: `npm run lint`

## Estructura del Proyecto
Resumen de carpetas principales:
```text
.
├─ supabase/
│  └─ functions/              # Supabase Edge Functions (Deno)
├─ src/
│  ├─ assets/                 # Recursos estáticos
│  ├─ components/             # Componentes reutilizables
│  ├─ context/                # Contextos/estado global
│  ├─ hooks/                  # Hooks personalizados
│  ├─ layouts/                # Layouts de pantallas
│  ├─ libs/                   # Clientes/SDKs (ej. supabase.ts)
│  ├─ modals/                 # Modales
│  ├─ routes/                 # Rutas y guards (ProtectedRoute, PermissionRoute, etc.)
│  ├─ screens/                # Pantallas (admin/customer/superadmin/auth)
│  ├─ services/               # Acceso a datos (DB/Storage/Edge Functions)
│  ├─ types/                  # Tipos/DTOs
│  └─ utils/                  # Utilidades
└─ index.html / vite.config.ts
```

## Uso del Sistema
Rutas principales:
- **Público:** `/` (landing), `/login`, `/register`, `/verify`, `/forgot-password`, `/update-password`
- **Admin:** `/admin/*` (dashboard, customers, devices, suppliers, inventory, tickets, budgets, proyectos, etc.)
- **Customer:** `/customer/*` (tickets, cotizaciones, notificaciones, perfil)
- **SuperAdmin:** `/superadmin/*` (dashboard y detalle por compañía)

Flujos típicos:
1. Registrar o iniciar sesión.
2. Según el rol/permisos, el usuario entra al área **Admin**, **Customer** o **SuperAdmin**.
3. Administrar entidades (clientes, usuarios, proyectos, tickets, etc.) según permisos configurados en la BD/RLS.

## Credenciales relevantes
### Frontend (obligatorio)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Endpoints (opcionales)
- `VITE_SUPABASE_EMAIL_INVITATION_URL` (por defecto: `${VITE_SUPABASE_URL}/functions/v1/email_invitation`)
- `VITE_SUPABASE_USER_STATUS_URL` (por defecto: `${VITE_SUPABASE_URL}/functions/v1/user_status`)

### Supabase Storage (buckets esperados por el código)
- `companies_logos` (logos de compañías; se usa `getPublicUrl`)
- `users_photos` (fotos de usuario; se usa `getPublicUrl`)
- `quotes_pdfs` (PDFs de cotizaciones; se usa `createSignedUrl`)
- `ticket-attachments` (adjuntos de tickets)
- `survey-media` (media/evidencias de site survey)
- `customer-site-attachments` (adjuntos del perfil 360 del cliente/sitio)

### Edge Functions (Supabase)
- `email_invitation`: invitación de usuarios/clientes (y rollback de usuario auth en caso de error).
- `user_status`: lectura/actualización del estado de usuarios (deshabilitar/baneo).
- `send_email_notification`: envío de notificaciones por correo (requiere SMTP/secrets).
- `quote_formal`: generación de cotización formal (PDF) y retorno de `pdfUrl`/estado.
- `generate-delivery-act-v3`: generación del acta de entrega (PDF).
- `sign-delivery-act`: firmado/actualización del acta de entrega.

> Las llaves sensibles (por ejemplo `SUPABASE_SERVICE_ROLE_KEY`, credenciales SMTP) deben configurarse como **secrets** en Supabase, no en el frontend.

## API utilizada y su implementación (paso a paso)
### 1) Cliente Supabase (Frontend)
El cliente se crea en `src/libs/supabase.ts` usando variables `VITE_*` y se reutiliza en los servicios.

### 2) Operaciones de BD (PostgREST vía supabase-js)
Los módulos en `src/services/*` acceden a tablas/vistas/RPC con:
- `supabase.from("tabla").select()/insert()/update()/delete()`
- `supabase.rpc("funcion_rpc", payload)` (ej.: `check_registration_availability` en registro)

### 3) Storage (archivos)
Subidas y lecturas se realizan con:
- `supabase.storage.from("<bucket>").upload(...)`
- `supabase.storage.from("<bucket>").getPublicUrl(...)`
- `supabase.storage.from("<bucket>").createSignedUrl(...)`

### 4) Edge Functions
Se consumen principalmente de 2 formas:
- **SDK:** `supabase.functions.invoke("nombre_funcion", { body, headers })`
- **HTTP directo:** `fetch(<url_de_funcion>, { headers: { apikey, Authorization }, body })`

Ejemplos implementados en el repo:
- Acta de entrega: `src/services/deliveryAct.service.ts` (invoca `generate-delivery-act-v3` y `sign-delivery-act`).
- Cotización formal: `src/services/quote.service.ts` (invoca `quote_formal` y firma URLs con Storage).
- Invitaciones: `src/services/userInvitations.service.ts` y `src/services/customerInvitations.service.ts` (llama `email_invitation`).
- Estado de usuarios: `src/services/users.service.ts` (llama `user_status`).
- Emails: `src/services/email-notification.service.ts` (invoca `send_email_notification`).

## Autor del desarrollado y Autor de administrador de proyecto
- **Autor del desarrollo:** Bryan Flores
- **Administrador del proyecto:** Rijo
