export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    "",
  // Server-only. Used by the agent background job, which runs without a
  // signed-in user and must read across students.
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  // Shared secret Vercel Cron sends as `Authorization: Bearer <CRON_SECRET>`.
  cronSecret: process.env.CRON_SECRET ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  // Must produce 1536-dim vectors to match workspace_chunks.embedding.
  openaiEmbeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
  // Agent voice mode: spoken replies (text-to-speech).
  openaiTtsModel: process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts",
  openaiTtsVoice: process.env.OPENAI_TTS_VOICE ?? "coral",
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
