import { NextResponse } from "next/server";

import { env, hasOpenAIEnv } from "@/lib/env";

/**
 * Mints an ephemeral OpenAI Realtime token specifically for the activity-entry
 * voice coach. The actual instructions and tool definitions are sent from the
 * client via `session.update` once the data channel is open, so this endpoint
 * stays minimal.
 */
export async function POST() {
  if (!hasOpenAIEnv()) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 500 },
    );
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
          audio: { output: { voice: "alloy" } },
          instructions:
            "You are Cultvr's activity intake coach. Help a high school student quickly capture details about one extracurricular activity for college applications.",
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
