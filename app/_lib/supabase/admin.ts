import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/app/_lib/db/types";
import { getServerEnv } from "@/app/_lib/env";

let adminInstance: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseAdminClient() {
  if (adminInstance) return adminInstance;

  const env = getServerEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  adminInstance = createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminInstance;
}
