import { revalidatePath } from "next/cache";
import { after, NextResponse } from "next/server";
import { z } from "zod";

import { isAgentToolName, toolArgSchemas, type AgentToolName } from "@/lib/agent/tools";
import { indexWorkspaceForUser } from "@/lib/agent/workspace-index";
import { hasOpenAIEnv, hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const requestSchema = z.object({
  actions: z
    .array(
      z.object({
        id: z.string().max(100).optional(),
        tool: z.string().max(60),
        args: z.record(z.string(), z.unknown()),
        reason: z.string().max(400).optional(),
      }),
    )
    .min(1)
    .max(10),
});

type ExecuteResult = { id?: string; tool: string; ok: boolean; detail: string };
type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Runs one approved, validated action. Throws on database errors. */
async function runAction(
  supabase: Supabase,
  userId: string,
  tool: AgentToolName,
  args: Record<string, unknown>,
): Promise<string> {
  const data = toolArgSchemas[tool].parse(args) as Record<string, string | null | undefined>;

  switch (tool) {
    case "create_goal": {
      const { error } = await supabase
        .from("goals")
        .insert({ title: data.title, target_date: data.target_date || null, user_id: userId });
      if (error) throw new Error(error.message);
      return `Goal created: ${data.title}`;
    }
    case "create_task": {
      const { error } = await supabase
        .from("tasks")
        .insert({ title: data.title, due_date: data.due_date || null, user_id: userId });
      if (error) throw new Error(error.message);
      return `Task created: ${data.title}`;
    }
    case "update_activity": {
      const updates: Record<string, string> = {};
      if (data.impact) updates.impact = data.impact;
      if (data.description) updates.description = data.description;
      if (!Object.keys(updates).length) throw new Error("No changes provided.");
      const { data: updated, error } = await supabase
        .from("activities")
        .update(updates)
        .eq("id", data.activity_id as string)
        .eq("user_id", userId)
        .select("id");
      if (error) throw new Error(error.message);
      if (!updated?.length) throw new Error("That activity was not found.");
      return `Activity updated: ${data.activity_name || "activity"}`;
    }
    case "add_college": {
      const { error } = await supabase.from("college_list").insert({
        name: data.name,
        location: data.location || null,
        fit_reason: data.fit_reason || null,
        status: data.status || "Dream",
        priority: "Medium",
        source: "conversation",
        last_mentioned_at: new Date().toISOString(),
        user_id: userId,
      });
      if (error) throw new Error(error.message);
      return `College added: ${data.name}`;
    }
    case "create_note": {
      const category = (data.category || "Reflection").trim();
      const { error } = await supabase.from("notes").insert({
        title: data.title,
        body: data.body,
        category: category.length >= 2 ? category : "Reflection",
        user_id: userId,
      });
      if (error) throw new Error(error.message);
      return `Note saved: ${data.title}`;
    }
  }
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 200 });
  }

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid execute payload." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: ExecuteResult[] = [];
  const logRows: Array<Record<string, unknown>> = [];

  for (const action of parsed.data.actions) {
    if (!isAgentToolName(action.tool)) {
      results.push({ id: action.id, tool: action.tool, ok: false, detail: "Unknown tool." });
      continue;
    }

    let ok = false;
    let detail: string;
    try {
      detail = await runAction(supabase, user.id, action.tool, action.args);
      ok = true;
    } catch (e) {
      detail =
        e instanceof z.ZodError
          ? "Invalid arguments."
          : e instanceof Error
            ? e.message
            : "Execution failed.";
    }

    results.push({ id: action.id, tool: action.tool, ok, detail });
    logRows.push({
      user_id: user.id,
      tool: action.tool,
      args: action.args,
      reason: action.reason ?? null,
      status: ok ? "executed" : "failed",
      result: detail,
    });
  }

  // Execution log. Best-effort: if the table isn't migrated yet, the actions
  // above still ran; the client keeps a local log instead.
  let logged = false;
  if (logRows.length) {
    const { error } = await supabase.from("agent_actions").insert(logRows);
    logged = !error;
    if (error) console.error("agent_actions insert failed:", error.message);
  }

  // Event-driven background job: the workspace changed, so refresh the RAG
  // index after the response is sent.
  if (results.some((r) => r.ok) && hasOpenAIEnv()) {
    after(async () => {
      try {
        await indexWorkspaceForUser(supabase, user.id);
      } catch (error) {
        console.error("Agent reindex after execute failed:", error);
      }
    });
  }

  revalidatePath("/dashboard");
  return NextResponse.json({ results, logged });
}
