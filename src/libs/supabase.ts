import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Dev-only helper: expose client for console debugging.
if (import.meta.env.DEV) {
  (window as any).supabase = supabase;
}
