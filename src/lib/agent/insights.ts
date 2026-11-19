import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Proactive insights — what the agent should surface the next time the
 * student opens Cultvr. Deterministic (no model call), so the background job
 * can run it for every student cheaply. Stored in agent_insights.
 */

export type InsightInput = {
  kind: string;
  title: string;
  detail: string | null;
  prompt: string;
};

type Row = Record<string, unknown>;

function isoDate(daysFromNow: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

function s(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function list(names: string[]) {
  return names.filter(Boolean).slice(0, 3).join(" · ");
}

export async function computeInsights(
  supabase: SupabaseClient,
  userId: string,
): Promise<InsightInput[]> {
  const [tasks, goals, activities] = await Promise.all([
    supabase
      .from("tasks")
      .select("title,status,due_date")
      .eq("user_id", userId)
      .neq("status", "done")
      .not("due_date", "is", null)
      .lte("due_date", isoDate(7))
      .order("due_date", { ascending: true })
      .limit(20),
    supabase
      .from("goals")
      .select("title,status,target_date")
      .eq("user_id", userId)
      .eq("status", "active")
      .not("target_date", "is", null)
      .lte("target_date", isoDate(14))
      .order("target_date", { ascending: true })
      .limit(20),
    supabase.from("activities").select("name,impact").eq("user_id", userId).limit(60),
  ]);

  const insights: InsightInput[] = [];
  const today = isoDate(0);

  const dueTasks = (tasks.data ?? []) as Row[];
  if (dueTasks.length) {
    const overdue = dueTasks.filter((t) => s(t.due_date) < today).length;
    const titles = dueTasks.map((t) => s(t.title));
    insights.push({
      kind: "tasks_due",
      title: overdue
        ? `${overdue} overdue and ${dueTasks.length - overdue} due this week`
        : `${dueTasks.length} task${dueTasks.length === 1 ? "" : "s"} due this week`,
      detail: list(titles),
      prompt: `Help me plan this week around these tasks: ${titles.slice(0, 5).join("; ")}.`,
    });
  }

  const soonGoals = (goals.data ?? []) as Row[];
  if (soonGoals.length) {
    const titles = soonGoals.map((g) => s(g.title));
    insights.push({
      kind: "goals_soon",
      title: `${soonGoals.length} goal${soonGoals.length === 1 ? "" : "s"} coming up in the next two weeks`,
      detail: list(titles),
      prompt: `Which of these goals needs attention first, and what is the next step? ${titles.slice(0, 5).join("; ")}.`,
    });
  }

  const acts = (activities.data ?? []) as Row[];
  const gaps = acts.filter((a) => !s(a.impact));
  if (gaps.length) {
    insights.push({
      kind: "activity_gaps",
      title: `${gaps.length} activit${gaps.length === 1 ? "y has" : "ies have"} no impact statement`,
      detail: list(gaps.map((a) => s(a.name))),
      prompt: "Help me write stronger impact statements for my activities that are missing one.",
    });
  }

  if (!acts.length && !dueTasks.length && !soonGoals.length) {
    insights.push({
      kind: "getting_started",
      title: "Your workspace is just getting started",
      detail: null,
      prompt: "Help me get started — what should I add to my workspace first?",
    });
  }

  return insights;
}

/**
 * Replace a student's open insights with a fresh set. Kinds the student
 * dismissed in the last 3 days are skipped so they don't instantly reappear.
 */
export async function refreshInsightsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: boolean; count: number; detail?: string }> {
  const insights = await computeInsights(supabase, userId);

  const recentlyDismissed = await supabase
    .from("agent_insights")
    .select("kind")
    .eq("user_id", userId)
    .eq("status", "dismissed")
    .gte("created_at", new Date(Date.now() - 3 * 86400_000).toISOString());
  if (recentlyDismissed.error) {
    return { ok: false, count: 0, detail: recentlyDismissed.error.message };
  }
  const skip = new Set(((recentlyDismissed.data ?? []) as Row[]).map((r) => s(r.kind)));

  const cleared = await supabase
    .from("agent_insights")
    .delete()
    .eq("user_id", userId)
    .eq("status", "new");
  if (cleared.error) return { ok: false, count: 0, detail: cleared.error.message };

  const fresh = insights.filter((insight) => !skip.has(insight.kind));
  if (!fresh.length) return { ok: true, count: 0 };

  const { error } = await supabase
    .from("agent_insights")
    .insert(fresh.map((insight) => ({ ...insight, user_id: userId })));
  if (error) return { ok: false, count: 0, detail: error.message };
  return { ok: true, count: fresh.length };
}
