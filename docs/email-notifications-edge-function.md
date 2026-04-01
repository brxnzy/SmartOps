# Email Notifications (Supabase Edge Function)

## 1) Function
Se creo la funcion:

- `supabase/functions/send_email_notification/index.ts`

Usa SMTP de Gmail via `nodemailer` para enviar correos de:

- eventos (`type: "event"`)
- transacciones (`type: "transaction"`)
- contenido custom (`type: "custom"`)
- adjuntos opcionales (`attachments`) para casos como cotizaciones PDF

## 2) Secrets requeridos
Configuralos en Supabase:

```bash
supabase secrets set GMAIL_SMTP_USER="tu-correo@gmail.com"
supabase secrets set GMAIL_SMTP_APP_PASSWORD="app-password-de-google"
supabase secrets set MAIL_SENDER_NAME="SmartOps"
supabase secrets set MAIL_SENDER_EMAIL="tu-correo@gmail.com"
```

Notas:

- Usa App Password de Google (requiere 2FA).
- No uses la contrasena normal de Gmail.

## 3) Deploy de la funcion
```bash
supabase functions deploy send_email_notification
```

## 4) Invocar desde frontend
Service disponible:

- `src/services/email-notification.service.ts`

Ejemplo sin adjunto (visita):

```ts
import { sendEmailNotification } from "../services/email-notification.service";

await sendEmailNotification({
  companyId,
  to: ["cliente@correo.com"],
  type: "event",
  title: "Visita tecnica programada",
  message: "La visita tecnica fue programada para el 2026-04-02 10:00 AM.",
  actionUrl: "https://tu-app.com/admin/tickets/abc123",
  metadata: {
    ticket: "TK-1234",
    tecnico: "Juan Perez",
  },
});
```

Ejemplo con adjunto (cotizacion PDF):

```ts
import {
  fileToEmailAttachment,
  sendEmailNotification,
} from "../services/email-notification.service";

const attachment = await fileToEmailAttachment(filePdf);

await sendEmailNotification({
  companyId,
  to: "cliente@correo.com",
  type: "transaction",
  title: "Cotizacion generada",
  message: "Adjuntamos la cotizacion en PDF.",
  attachments: [attachment],
});
```

Estructura de adjuntos:

```ts
attachments: [
  {
    filename: "cotizacion-001.pdf",
    contentBase64: "<base64-sin-data-prefix>",
    contentType: "application/pdf",
  },
];
```

Limites actuales en la funcion:

- maximo 5 adjuntos
- maximo 5MB por adjunto
- maximo 10MB total por correo

## 5) Seguridad

- La funcion exige `Authorization` (usuario autenticado).
- Si envias `companyId`, valida que el usuario autenticado pertenezca a esa compania.
- El envio SMTP ocurre solo server-side (edge), nunca desde el navegador.
