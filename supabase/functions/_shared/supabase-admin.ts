import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export function createSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment configuration");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}
