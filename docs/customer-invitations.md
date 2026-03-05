# Customer Invitations With Supabase CLI

## Estado actual (ya alineado en el proyecto)

- Function email envio: `email_invitation`
- Function aceptacion: `email_accept_invitation`
- Frontend endpoints:
  - `VITE_SUPABASE_EMAIL_INVITATION_URL`
  - `VITE_SUPABASE_ACCEPT_INVITATION_URL`

## Archivos clave

- [email_invitation function](C:/REACT/SmartOps/supabase/functions/email_invitation/index.ts)
- [email_accept_invitation function](C:/REACT/SmartOps/supabase/functions/email_accept_invitation/index.ts)
- [migration SQL](C:/REACT/SmartOps/supabase/migrations/20260302120000_customer_invitations.sql)
- [frontend invitation service](C:/REACT/SmartOps/src/services/customerInvitations.service.ts)

## Comandos CLI (orden recomendado)

1. Login y link al proyecto remoto:

```bash
supabase login
supabase link --project-ref ucuenkqcpdibheuyabdb
```

2. Configurar secrets de functions:

```bash
supabase secrets set RESEND_API_KEY=TU_RESEND_KEY
supabase secrets set INVITE_FROM_EMAIL="SmartOps <onboarding@resend.dev>"
```

3. Aplicar migraciones a remoto:

```bash
supabase db push
```

4. Deploy de ambas functions:

```bash
supabase functions deploy email_invitation
supabase functions deploy email_accept_invitation
```

5. Ver logs (si algo falla):

```bash
supabase functions logs --name email_invitation
supabase functions logs --name email_accept_invitation
```

## Test rapido por CLI/curl

### Envio de invitacion

```bash
curl -X POST "https://ucuenkqcpdibheuyabdb.supabase.co/functions/v1/email_invitation" ^
  -H "Content-Type: application/json" ^
  -H "apikey: TU_ANON_KEY" ^
  -H "Authorization: Bearer TU_ACCESS_TOKEN_ADMIN" ^
  -d "{\"email\":\"cliente@correo.com\",\"inviteUrl\":\"http://localhost:5173/customer-invite?token=test\",\"customerName\":\"Juan\",\"companyName\":\"SmartOps\",\"expiresAt\":\"2026-03-04T00:00:00.000Z\"}"
```

### Aceptar invitacion

```bash
curl -X POST "https://ucuenkqcpdibheuyabdb.supabase.co/functions/v1/email_accept_invitation" ^
  -H "Content-Type: application/json" ^
  -H "apikey: TU_ANON_KEY" ^
  -d "{\"token\":\"TOKEN_REAL\",\"password\":\"Password123\"}"
```

## Notas

- `email_invitation` requiere usuario admin autenticado (JWT valido).
- `email_accept_invitation` tiene `verify_jwt = false` en CLI para permitir uso publico con token de invitacion.
- El link de invitacion expira en 48 horas.
