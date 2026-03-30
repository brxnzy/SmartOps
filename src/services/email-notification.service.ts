import { supabase } from "../libs/supabase";
import type {
  EmailAttachmentInput,
  SendEmailNotificationInput,
  SendEmailNotificationResult,
} from "../types/emailNotification";

export async function sendEmailNotification(
  payload: SendEmailNotificationInput
): Promise<SendEmailNotificationResult> {
  const { data, error } = await supabase.functions.invoke("send_email_notification", {
    body: payload,
  });

  if (error) {
    throw new Error(error.message || "No se pudo invocar la funcion de notificacion por correo.");
  }

  const result = (data ?? {}) as SendEmailNotificationResult & { error?: string };
  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

export async function fileToEmailAttachment(file: File): Promise<EmailAttachmentInput> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("No se pudo convertir el archivo a base64."));
        return;
      }

      const [, encoded = ""] = result.split(",");
      resolve(encoded);
    };

    reader.onerror = () => {
      reject(new Error("Error leyendo el archivo para adjuntar."));
    };

    reader.readAsDataURL(file);
  });

  return {
    filename: file.name,
    contentBase64: base64,
    contentType: file.type || "application/octet-stream",
  };
}
