import { NextResponse } from "next/server";

import { env, hasOpenAIEnv, hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  if (!hasOpenAIEnv()) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 200 },
    );
  }

  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
          instructions:
            "You are Cultvr, a warm but concise college planning coach. Help the student talk through achievements, activities, goals, and next tasks. Do not claim to be a licensed counselor. Ask permission before suggesting durable updates to their workspace.",
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

  return NextResponse.json(await response.json());
}
