import { after, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

import { ADAPTIVE_COACHING_RULES, sessionModeInstructions } from "@/lib/agent/coaching";
import { AGENT_TOOLS, isAgentToolName } from "@/lib/agent/tools";
import { indexWorkspaceForUser, isIndexStale, searchWorkspace } from "@/lib/agent/workspace-index";
import { env, hasOpenAIEnv, hasSupabaseEnv } from "@/lib/env";
import { getOpenAI } from "@/lib/openai";
import {
  buildStudentSessionContext,
  formatStudentContextForPrompt,
} from "@/lib/student-context";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const MAX_STEPS = 4;

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
  voice: z.boolean().optional(),
  // Guided Session mode: the session's label and its coaching script/focus.
  session: z
    .object({
      label: z.string().min(1).max(160),
      focus: z.string().max(600).optional(),
    })
    .optional(),
});

const VOICE_ADDENDUM = `

VOICE MODE: the student is talking to you out loud and your reply will be spoken aloud.
- Reply in 1-3 short, natural spoken sentences (under about 60 words). It is a conversation, not a report.
- No lists, markdown, symbols, links, or reading out dates digit by digit.
- If you propose actions, do not read the details out; say something like "I've put a couple of suggestions on your screen — take a look." The cards carry the details.
- End with one easy question or invitation so the student knows it's their turn.`;

const SYSTEM_PROMPT = `You are the Cultvr Agent — a proactive college-coaching agent that works alongside a high school student inside their Cultvr workspace.

You can see a summary of the student's workspace (profile, activities, awards, goals, tasks, deadlines, recent sessions). Use it to:
- Review what they have and name the 1-3 highest-leverage priorities right now.
- Look things up when you need specifics: call search_workspace to retrieve details from their notes, past sessions, activities, awards, goals and colleges before making claims about them.
- When a concrete, consequential change would genuinely help, PROPOSE it by calling the matching tool: create_goal, create_task, update_activity (improve an existing activity), add_college, or create_note. You are proposing, never doing: every one of these is a suggestion the student must approve before anything is saved.
- Tie each proposal to something real in their workspace (a gap, a deadline, a recent activity), and include a one-sentence reason.

${ADAPTIVE_COACHING_RULES}

Rules:
- Never claim an action is done. Proposal tools only create cards awaiting the student's approval.
- Propose at most 3 actions in a turn, and never duplicate something that already exists.
- If you lack the context to be specific, search first; if it's still missing, ask instead of inventing details.
- Keep your written reply warm, concrete, and under about 140 words: briefly say what you found and what you are proposing. The proposal cards carry the details.`;

type Proposal = {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  reason?: string;
};

type ToolOutput = { type: "function_call_output"; call_id: string; output: string };

function parseArgs(raw: string | undefined): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

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
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  let userId: string | null = null;

  if (hasSupabaseEnv()) {
    supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;

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

    // Event-driven background work: keep the RAG index fresh without making
    // the student wait. Runs after the response is sent.
    const client = supabase;
    const uid = user.id;
    after(async () => {
      try {
        if (await isIndexStale(client, uid)) await indexWorkspaceForUser(client, uid);
      } catch (error) {
        console.error("Agent reindex failed:", error);
      }
    });
  }

  const conversation = parsed.data.messages
    .slice(-16)
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");

  const openai = getOpenAI();
  const tools = AGENT_TOOLS as unknown as OpenAI.Responses.Tool[];

  let response = await openai.responses.create({
    model: env.openaiModel,
    tool_choice: "auto",
    tools,
    input: [
      {
        role: "system",
        content:
          SYSTEM_PROMPT +
          (parsed.data.session
            ? sessionModeInstructions(parsed.data.session.label, parsed.data.session.focus)
            : "") +
          (parsed.data.voice ? VOICE_ADDENDUM : "") +
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

  const proposals: Proposal[] = [];
  const seen = new Set<string>();
  const trace: string[] = [];
  let message = response.output_text ?? "";

  // Orchestration loop: execute read tools, collect write proposals, and feed
  // every tool result back until the model answers in plain text.
  for (let step = 0; step < MAX_STEPS; step++) {
    const outputs: ToolOutput[] = [];

    for (const item of response.output ?? []) {
      if (item.type !== "function_call") continue;
      const args = parseArgs(item.arguments);
      let output: string;

      if (item.name === "search_workspace") {
        const query = typeof args.query === "string" ? args.query : "";
        trace.push(`Searched workspace: ${query}`);
        output =
          supabase && userId
            ? await searchWorkspace(supabase, userId, query)
            : "Workspace search is unavailable right now.";
      } else if (isAgentToolName(item.name)) {
        const key = `${item.name}:${JSON.stringify(args)}`;
        if (!seen.has(key) && proposals.length < 5) {
          seen.add(key);
          proposals.push({
            id: item.call_id ?? item.id ?? crypto.randomUUID(),
            tool: item.name,
            args,
            reason: typeof args.reason === "string" ? args.reason : undefined,
          });
        }
        output =
          "Shown to the student as a proposal card awaiting their approval. It has NOT been done yet — do not say it was.";
      } else {
        output = "Unknown tool.";
      }

      outputs.push({ type: "function_call_output", call_id: item.call_id, output });
    }

    if (!outputs.length || step === MAX_STEPS - 1) break;

    response = await openai.responses.create({
      model: env.openaiModel,
      tool_choice: "auto",
      tools,
      previous_response_id: response.id,
      input: outputs,
    });
    if (response.output_text) message = response.output_text;
  }

  if (!message.trim()) {
    message = proposals.length
      ? "Here is what I would suggest. Approve anything useful, or tell me what is actually on your mind."
      : "Tell me a bit more about what you want to work on, and I will take it from there.";
  }

  return NextResponse.json({ message, proposedActions: proposals, trace });
}
