import { NextResponse } from "next/server";

import { env, hasOpenAIEnv, hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Transcribes a recorded voice note to text (OpenAI audio transcription). Used
 * by the Open Session free-write surface so a student can dictate a note. This
 * is plain speech-to-text — no chat, no coach, no model responses.
 */
export async function POST(request: Request) {
  if (!hasOpenAIEnv()) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
  }

  // Gate behind auth so the OpenAI key can't be spent by anonymous callers.
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const form = await request.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: "No audio provided." }, { status: 400 });
  }
  // OpenAI caps uploads at 25MB; reject earlier with a friendly message.
  if (audio.size > 25 * 1024 * 1024) {
    return NextResponse.json(
      { error: "That recording is too long. Try a shorter voice note." },
      { status: 413 },
    );
  }

  const upstream = new FormData();
  upstream.append("file", audio, audio.name || "voice-note.webm");
  upstream.append("model", "gpt-4o-transcribe");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.openaiApiKey}` },
    body: upstream,
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("Transcription failed:", detail);
    return NextResponse.json(
      { error: "Transcription failed. Please try again." },
      { status: 502 },
    );
  }

  const data = (await res.json()) as { text?: string };
  return NextResponse.json({ text: typeof data.text === "string" ? data.text : "" });
}
