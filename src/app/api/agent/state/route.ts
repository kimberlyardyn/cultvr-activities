import { NextResponse } from "next/server";
import { z } from "zod";

import { refreshInsightsForUser } from "@/lib/agent/insights";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

// Insights older than this are recomputed on open, so the panel is useful even
// before (or between) background-job runs.
const INSIGHT_MAX_AGE_MS = 20 * 3600_000;

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ insights: [], log: [], setupNeeded: false });
  }
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const readInsights = () =>
    supabase
      .from("agent_insights")
      .select("id,kind,title,detail,prompt,created_at")
      .eq("user_id", user.id)
      .eq("status", "new")
      .order("created_at", { ascending: false })
      .limit(6);

  let insights = await readInsights();
  if (insights.error) {
    // Tables not migrated yet — the panel still works, just without history.
    return NextResponse.json({ insights: [], log: [], setupNeeded: true });
  }

  const newest = insights.data?.[0]?.created_at as string | undefined;
  if (!newest || Date.now() - new Date(newest).getTime() > INSIGHT_MAX_AGE_MS) {
    const refreshed = await refreshInsightsForUser(supabase, user.id);
    if (refreshed.ok) insights = await readInsights();
  }

  const log = await supabase
    .from("agent_actions")
    .select("id,tool,args,reason,status,result,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    insights: insights.data ?? [],
    log: log.data ?? [],
    setupNeeded: Boolean(log.error),
  });
}

const postSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("dismiss_insight"), id: z.string().max(100) }),
  z.object({
    action: z.literal("log_dismissed"),
    tool: z.string().max(60),
    args: z.record(z.string(), z.unknown()),
    reason: z.string().max(400).optional(),
  }),
]);

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ ok: false });
  const parsed = postSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (parsed.data.action === "dismiss_insight") {
    const { error } = await supabase
      .from("agent_insights")
      .update({ status: "dismissed" })
      .eq("id", parsed.data.id)
      .eq("user_id", user.id);
    return NextResponse.json({ ok: !error });
  }

  const { error } = await supabase.from("agent_actions").insert({
    user_id: user.id,
    tool: parsed.data.tool,
    args: parsed.data.args,
    reason: parsed.data.reason ?? null,
    status: "dismissed",
    result: "Dismissed by student",
  });
  return NextResponse.json({ ok: !error });
}
