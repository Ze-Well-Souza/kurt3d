import { createClient } from "@supabase/supabase-js";
import { getServerConfig } from "../config.server";

export function getSupabaseAdminClient() {
  const config = getServerConfig();
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

