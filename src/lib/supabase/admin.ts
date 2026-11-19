import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

/**
 * Service-role Supabase client for trusted server jobs (e.g. the agent cron).
 * Bypasses RLS — never import this from client components, and always scope
 * queries with an explicit user_id. Returns null when the key isn't set.
 */
export function createAdminClient() {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) return null;
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
