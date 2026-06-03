export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
  openaiRealtimeModel: process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime",
  // Comma-separated list of administrator emails. These accounts can manage the
  // global AI instructions from Settings. Defaults to the project admin.
  adminEmails: (process.env.ADMIN_EMAILS ?? "savantseal@gmail.com")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
};

export function hasSupabaseEnv() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function hasOpenAIEnv() {
  return Boolean(env.openaiApiKey);
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return env.adminEmails.includes(email.toLowerCase());
}
