import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isAgentToolName, toolArgSchemas } from "@/lib/agent/tools";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  actions: z
    .array(
      z.object({
        id: z.string().max(100).optional(),
        tool: z.string().max(60),
        args: z.record(z.string(), z.unknown()),
      }),
    )
    .min(1)
    .max(10),
});

type ExecuteResult = { id?: string; tool: string; ok: boolean; detail: string };

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

  for (const action of parsed.data.actions) {
    if (!isAgentToolName(action.tool)) {
      results.push({ id: action.id, tool: action.tool, ok: false, detail: "Unknown tool." });
      continue;
    }

    const argParse = toolArgSchemas[action.tool].safeParse(action.args);
    if (!argParse.success) {
      results.push({ id: action.id, tool: action.tool, ok: false, detail: "Invalid arguments." });
      continue;
    }

    try {
      if (action.tool === "create_goal") {
        const { title, target_date } = argParse.data as {
          title: string;
          target_date?: string | null;
        };
        const { error } = await supabase
          .from("goals")
          .insert({ title, target_date: target_date || null, user_id: user.id });
        if (error) throw new Error(error.message);
        results.push({ id: action.id, tool: action.tool, ok: true, detail: `Goal created: ${title}` });
      } else if (action.tool === "create_task") {
        const { title, due_date } = argParse.data as {
          title: string;
          due_date?: string | null;
        };
        const { error } = await supabase
          .from("tasks")
          .insert({ title, due_date: due_date || null, user_id: user.id });
        if (error) throw new Error(error.message);
        results.push({ id: action.id, tool: action.tool, ok: true, detail: `Task created: ${title}` });
      } else if (action.tool === "update_activity") {
        const { activity_id, impact, description } = argParse.data as {
          activity_id: string;
          impact?: string | null;
          description?: string | null;
        };
        const updates: Record<string, string> = {};
        if (impact) updates.impact = impact;
        if (description) updates.description = description;
        if (Object.keys(updates).length === 0) {
          results.push({ id: action.id, tool: action.tool, ok: false, detail: "No changes provided." });
        } else {
          const { error } = await supabase.from("activities").update(updates).eq("id", activity_id);
          if (error) throw new Error(error.message);
          results.push({ id: action.id, tool: action.tool, ok: true, detail: "Activity updated." });
        }
      }
    } catch (e) {
      results.push({
        id: action.id,
        tool: action.tool,
        ok: false,
        detail: e instanceof Error ? e.message : "Execution failed.",
      });
    }
  }

  revalidatePath("/dashboard");
  return NextResponse.json({ results });
}
