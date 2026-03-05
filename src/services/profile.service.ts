import { supabase } from "../libs/supabase";
import type { UserProfile } from "../types/User";
import type { UserRow } from "../types/types";


export async function getUserProfileById(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, id_card")
    .eq("id", userId)
    .maybeSingle<UserRow>();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    idCard: data.id_card,
  };
}
