import { supabase } from "../libs/supabase";
import type { UserProfile } from "../types/User";
import type { UserRow } from "../types/types";
import { logAuditEvent } from "./audit.service";


export async function getUserProfileById(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, id_card, photo_url")
    .eq("id", userId)
    .maybeSingle<UserRow>();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    idCard: data.id_card,
    photoUrl: data.photo_url ?? null,
  };
}

export async function updateUserProfile(input: {
  userId: string;
  name: string;
  idCard: string | null;
  photoUrl?: string | null;
}): Promise<UserProfile> {
  const payload: Record<string, string | null> = {
    name: input.name,
    id_card: input.idCard,
  };

  if (input.photoUrl !== undefined) {
    payload.photo_url = input.photoUrl;
  }

  const { data, error } = await supabase
    .from("users")
    .update(payload)
    .eq("id", input.userId)
    .select("id, name, id_card, photo_url")
    .single<UserRow>();

  if (error) throw error;

  await logAuditEvent({
    action: "update",
    entity: "users",
    entityId: data.id,
    newValues: {
      name: data.name,
      idCard: data.id_card,
      photoUrl: data.photo_url,
    },
  });

  return {
    id: data.id,
    name: data.name,
    idCard: data.id_card,
    photoUrl: data.photo_url ?? null,
  };
}

export async function uploadUserPhoto(params: {
  userId: string;
  file: File;
}): Promise<string> {
  const ext = params.file.name.split(".").pop() || "jpg";
  const objectPath = `${params.userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("users_photos")
    .upload(objectPath, params.file, {
      upsert: true,
      contentType: params.file.type || "image/jpeg",
      cacheControl: "3600",
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("users_photos").getPublicUrl(objectPath);

  await logAuditEvent({
    action: "upload",
    entity: "users_photos",
    entityId: params.userId,
    userId: params.userId,
    newValues: { objectPath },
  });

  return data.publicUrl;
}

export async function deleteUserPhoto(userId: string) {
  // Lista todos los archivos del usuario y los elimina
  const { data: files, error: listError } = await supabase.storage
    .from("users_photos")
    .list(userId);

  if (listError) throw listError;
  if (!files || files.length === 0) return;

  const paths = files.map((f) => `${userId}/${f.name}`);
  const { error } = await supabase.storage.from("users_photos").remove(paths);
  if (error) throw error;

  await logAuditEvent({
    action: "delete",
    entity: "users_photos",
    entityId: userId,
    userId,
    newValues: { paths },
  });
}
