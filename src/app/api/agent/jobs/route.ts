import { NextResponse } from "next/server";

import { refreshInsightsForUser } from "@/lib/agent/insights";
import { indexWorkspaceForUser } from "@/lib/agent/workspace-index";
import { env, hasOpenAIEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Agent background job — triggered daily by Vercel Cron (see vercel.json).
 * For every student: refresh proactive insights, and re-embed their workspace
 * for RAG. Authenticated with CRON_SECRET; needs SUPABASE_SERVICE_ROLE_KEY
 * because it runs without a signed-in user.
 */

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const MAX_USERS_PER_RUN = 500;

export async function GET(request: Request) {
  if (!env.cronSecret || request.headers.get("authorization") !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ skipped: "SUPABASE_SERVICE_ROLE_KEY is not set." });
  }

  const startedAt = Date.now();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id")
    .limit(MAX_USERS_PER_RUN);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const summary = { users: 0, insights: 0, indexed: 0, failures: [] as string[] };
  const canEmbed = hasOpenAIEnv();

  for (const profile of profiles ?? []) {
    const userId = profile.id as string;
    summary.users += 1;
    try {
      const insights = await refreshInsightsForUser(admin, userId);
      if (insights.ok) summary.insights += insights.count;
      else summary.failures.push(`${userId}: insights — ${insights.detail}`);

      if (canEmbed) {
        const index = await indexWorkspaceForUser(admin, userId);
        if (index.ok) summary.indexed += 1;
        else summary.failures.push(`${userId}: index — ${index.detail}`);
      }
    } catch (e) {
      summary.failures.push(`${userId}: ${e instanceof Error ? e.message : "failed"}`);
    }

    // Stay inside the function's time budget; the next daily run continues.
    if (Date.now() - startedAt > (maxDuration - 20) * 1000) break;
  }

  console.log("Agent job run:", JSON.stringify({ ...summary, failures: summary.failures.length }));
  return NextResponse.json({ ...summary, failures: summary.failures.slice(0, 20) });
}
