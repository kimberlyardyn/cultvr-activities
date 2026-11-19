import { NextResponse } from "next/server";
import { z } from "zod";

import { env, hasOpenAIEnv, hasSupabaseEnv } from "@/lib/env";
import { getOpenAI } from "@/lib/openai";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Text-to-speech for the agent's voice mode: turns a (short) agent reply into
 * audio the panel plays back. Auth-gated so the OpenAI key can't be spent by
 * anonymous callers.
 */

const requestSchema = z.object({ text: z.string().min(1).max(2000) });

function forSpeech(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_#>`~]/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1500);
}

export async function POST(request: Request) {
  if (!hasOpenAIEnv()) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
  }

  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid speech payload." }, { status: 400 });
  }
  const input = forSpeech(parsed.data.text);
  if (!input) return NextResponse.json({ error: "Nothing to say." }, { status: 400 });

  try {
    const speech = await getOpenAI().audio.speech.create({
      model: env.openaiTtsModel,
      voice: env.openaiTtsVoice,
      input,
      instructions:
        "Speak warmly and naturally, like a supportive college coach talking with a high school student. Conversational pace, not rushed.",
      response_format: "mp3",
    });
    const audio = await speech.arrayBuffer();
    return new Response(audio, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Agent speech failed:", error);
    return NextResponse.json({ error: "Could not generate speech." }, { status: 502 });
  }
}
