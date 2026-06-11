import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client com service role — SERVER-ONLY (bypassa RLS; usado pelo sync VHSYS).
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("Admin client não pode ser usado no browser");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes no ambiente");
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
