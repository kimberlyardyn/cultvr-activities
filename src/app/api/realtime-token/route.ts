import { NextResponse } from "next/server";
import { z } from "zod";

import { env, hasOpenAIEnv, hasSupabaseEnv } from "@/lib/env";
import {
  buildRealtimeInstructions,
  buildStudentSessionContext,
  createPersonalizedSessionPlan,
} from "@/lib/student-context";
import { createClient } from "@/lib/supabase/server";
import type { PersonalizedSessionPlan } from "@/lib/types";

const requestSchema = z.object({
  currentPrompt: z.string().max(1000).optional(),
  sessionFocus: z.string().max(500).nullable().optional(),
  sessionPrompts: z.array(z.string().max(1000)).max(10).optional(),
  sessionTitle: z.string().max(140).optional(),
});

export async function GET() {
  return createRealtimeToken({});
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid realtime session payload." }, { status: 400 });
  }

  return createRealtimeToken(parsed.data);
}

async function createRealtimeToken(sessionRequest: z.infer<typeof requestSchema>) {
  if (!hasOpenAIEnv()) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 200 },
    );
  }

  let instructions =
    "You are Cultvr, a warm but concise college planning coach. Help the student talk through achievements, activities, goals, and next tasks. Do not claim to be a licensed counselor. Ask permission before suggesting durable updates to their workspace.";
  let questionPlan: PersonalizedSessionPlan | null = null;

  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const studentContext = await buildStudentSessionContext(supabase, user.id);
    const plan = createPersonalizedSessionPlan({
      context: studentContext,
      currentPrompt: sessionRequest.currentPrompt,
      defaultPrompts: sessionRequest.sessionPrompts,
      sessionFocus: sessionRequest.sessionFocus,
      sessionTitle: sessionRequest.sessionTitle ?? "Open college planning session",
    });

    instructions = buildRealtimeInstructions(plan, studentContext.adminInstructions);
    questionPlan = plan;
  }

  const response = await fetch(
    "https://api.openai.com/v1/realtime/client_secrets",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: env.openaiRealtimeModel,
          audio: {
            output: {
              voice: "alloy",
            },
          },
          instructions,
        },
      }),
    },
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: await response.text() },
      { status: response.status },
    );
  }

  return NextResponse.json({ ...(await response.json()), instructions, questionPlan });
}
