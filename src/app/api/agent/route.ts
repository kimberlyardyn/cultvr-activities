import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

import { AGENT_TOOLS, isAgentToolName } from "@/lib/agent/tools";
import { env, hasOpenAIEnv, hasSupabaseEnv } from "@/lib/env";
import { getOpenAI } from "@/lib/openai";
import {
  buildStudentSessionContext,
  formatStudentContextForPrompt,
} from "@/lib/student-context";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(40),
});

const SYSTEM_PROMPT = `You are the Cultvr Agent — a proactive college-coaching agent that works alongside a high school student inside their Cultvr workspace.

You can see the student's workspace context (profile, activities, awards, goals, tasks, deadlines, recent sessions). Use it to:
- Review what they have and name the 1-3 highest-leverage priorities right now.
- When a concrete, consequential change would genuinely help (a new goal, or a new task/deadline), PROPOSE it by calling the matching tool. You are proposing, never doing: every tool call is a suggestion the student must approve before anything is saved.
- Tie each proposal to something real in their workspace (a gap, a deadline, a recent activity), and include a one-sentence reason.

How much to lead (read the student on each turn):
- If the student is specific and steering (names a topic, goal, or decision), stay in a listen-and-guide mode: ask one good question and reflect what they said; propose only lightly. Do not flood them with actions.
- If the student is vague, stuck, or gives short, uncommitted answers, lead more: name the 1-3 priorities and propose concrete actions with reasons.
- If the student explicitly asks you to decide ("just tell me what to do"), lead with a plan: propose the specific next step and say why.
- Always frame proposals as offers with a reason, never commands, and always leave an easy out. De-escalate the moment the student re-engages with a real answer.

Rules:
- Never claim an action is done. Tools create proposals awaiting the student's approval.
- Propose at most 3 actions in a turn, and never duplicate something that already exists.
- If you lack the context to be specific, ask a question instead of inventing details.
- Keep your written reply warm, concrete, and under about 140 words: briefly say what you found and what you are proposing. The proposal cards carry the details.`;

export async function POST(request: Request) {
  if (!hasOpenAIEnv()) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 200 },
    );
  }

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid agent payload." }, { status: 400 });
  }

  let context = "No saved workspace context yet.";
  let adminInstructions = "";
  let editableIndex = "";

  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const studentContext = await buildStudentSessionContext(supabase, user.id);
    context = formatStudentContextForPrompt(studentContext) || context;
    adminInstructions = studentContext.adminInstructions;
    editableIndex = studentContext.activities
      .slice(0, 12)
      .map(
        (activity) =>
          `- [${activity.id}] ${activity.name}${activity.role ? ` (${activity.role})` : ""}${
            activity.impact ? ` — impact: ${activity.impact}` : " — no impact statement yet"
          }`,
      )
      .join("\n");
  }

  const conversation = parsed.data.messages
    .slice(-16)
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");

  const openai = getOpenAI();
  const response = await openai.responses.create({
    model: env.openaiModel,
    tool_choice: "auto",
    tools: AGENT_TOOLS as unknown as OpenAI.Responses.Tool[],
    input: [
      {
        role: "system",
        content:
          SYSTEM_PROMPT +
          (adminInstructions
            ? `\n\nAdministrator guidance you must follow:\n${adminInstructions}`
            : ""),
      },
      {
        role: "user",
        content:
          `Student workspace context:\n${context}\n\n` +
          `Activities you can improve with update_activity (use the exact id in brackets):\n${editableIndex || "none yet"}\n\n` +
          `Conversation so far:\n${conversation}`,
      },
    ],
  });

  const proposedActions: Array<{
    id: string;
    tool: string;
    args: Record<string, unknown>;
    reason?: string;
  }> = [];

  for (const item of response.output ?? []) {
    if (item.type !== "function_call" || !isAgentToolName(item.name)) continue;
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(item.arguments || "{}") as Record<string, unknown>;
    } catch {
      args = {};
    }
    proposedActions.push({
      id: item.call_id ?? item.id ?? crypto.randomUUID(),
      tool: item.name,
      args,
      reason: typeof args.reason === "string" ? args.reason : undefined,
    });
  }

  return NextResponse.json({
    message: response.output_text ?? "",
    proposedActions,
  });
}
