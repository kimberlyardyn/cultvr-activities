import { NextResponse } from "next/server";
import { z } from "zod";

import { env, hasOpenAIEnv, hasSupabaseEnv } from "@/lib/env";
import { getOpenAI } from "@/lib/openai";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(4000),
    }),
  ),
});

export async function POST(request: Request) {
  if (!hasOpenAIEnv()) {
    return NextResponse.json(
      { message: "OPENAI_API_KEY is not configured." },
      { status: 200 },
    );
  }

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid chat payload." }, { status: 400 });
  }

  let context = "";

  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [notes, goals, tasks, activities] = await Promise.all([
      supabase
        .from("notes")
        .select("title,body,category")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("goals")
        .select("title,status,target_date")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("tasks")
        .select("title,status,due_date")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("activities")
        .select("name,role,impact,years")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    context = JSON.stringify({
      notes: notes.data ?? [],
      goals: goals.data ?? [],
      tasks: tasks.data ?? [],
      activities: activities.data ?? [],
    });
  }

  const openai = getOpenAI();
  const latestUserText = parsed.data.messages
    .slice(-8)
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");

  const response = await openai.responses.create({
    model: env.openaiModel,
    input: [
      {
        role: "system",
        content:
          "You are Cultvr, a concise college counseling assistant for high school students. Help students reflect, identify concrete achievements, shape goals, and define next tasks. Avoid inventing credentials or outcomes. Ask one useful follow-up when needed. Keep answers structured and under 180 words.",
      },
      {
        role: "user",
        content: `Student workspace context:\n${context || "No saved context yet."}\n\nConversation:\n${latestUserText}`,
      },
    ],
  });

  return NextResponse.json({
    message: response.output_text,
  });
}
