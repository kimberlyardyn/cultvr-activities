"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const noteSchema = z.object({
  title: z.string().min(2).max(120),
  body: z.string().min(2).max(6000),
  category: z.string().min(2).max(40),
});

const goalSchema = z.object({
  title: z.string().min(2).max(160),
  target_date: z.string().optional(),
});

const taskSchema = z.object({
  title: z.string().min(2).max(160),
  due_date: z.string().optional(),
});

const guidedSessionSchema = z.object({
  session_type: z.string().min(2).max(80),
  session_label: z.string().min(2).max(120),
  session_focus: z.string().max(240).optional(),
  interaction_mode: z.enum(["voice", "chat", "mixed"]),
  transcript: z.string().max(20000).optional(),
  prompt_answers: z.string().optional(),
  note_title: z.string().min(2).max(120),
  note_body: z.string().min(2).max(6000),
});

const guidedPromptAnswerSchema = z.array(
  z.object({
    prompt_index: z.number().int().min(0),
    prompt: z.string().min(1).max(1000),
    answer: z.string().max(10000).optional(),
    source: z.enum(["voice", "chat", "manual"]).optional(),
  }),
);

const activitySchema = z.object({
  name: z.string().min(2).max(160),
  role: z.string().max(160).optional(),
  years: z.string().max(80).optional(),
  impact: z.string().max(1200).optional(),
});

const awardSchema = z.object({
  name: z.string().min(2).max(160),
  scope: z.string().max(80).optional(),
  year: z.string().max(20).optional(),
});

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return { supabase, user };
}

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parsePromptAnswers(raw: string | undefined) {
  if (!raw) return [];

  try {
    return guidedPromptAnswerSchema.parse(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function createNote(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = noteSchema.parse({
    title: value(formData, "title"),
    body: value(formData, "body"),
    category: value(formData, "category") || "Reflection",
  });

  await supabase.from("notes").insert({ ...parsed, user_id: user.id });
  revalidatePath("/dashboard");
}

export async function createGoal(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = goalSchema.parse({
    title: value(formData, "title"),
    target_date: value(formData, "target_date") || null,
  });

  await supabase.from("goals").insert({ ...parsed, user_id: user.id });
  revalidatePath("/dashboard");
}

export async function createTask(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = taskSchema.parse({
    title: value(formData, "title"),
    due_date: value(formData, "due_date") || null,
  });

  await supabase.from("tasks").insert({ ...parsed, user_id: user.id });
  revalidatePath("/dashboard");
}

export async function createGuidedSessionArtifacts(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = guidedSessionSchema.parse({
    session_type: value(formData, "session_type"),
    session_label: value(formData, "session_label"),
    session_focus: value(formData, "session_focus") || undefined,
    interaction_mode: value(formData, "interaction_mode") || "voice",
    transcript: value(formData, "transcript") || undefined,
    prompt_answers: value(formData, "prompt_answers"),
    note_title: value(formData, "note_title"),
    note_body: value(formData, "note_body"),
  });
  const promptAnswers = parsePromptAnswers(parsed.prompt_answers);
  const answeredCount = promptAnswers.filter((item) => item.answer?.trim()).length;

  const noteResult = await supabase
    .from("notes")
    .insert({
      user_id: user.id,
      title: parsed.note_title,
      body: parsed.note_body,
      category: `Guided: ${parsed.session_type}`.slice(0, 40),
    })
    .select("id")
    .single();

  if (noteResult.error) throw noteResult.error;

  const sessionResult = await supabase
    .from("guided_sessions")
    .insert({
      user_id: user.id,
      session_type: parsed.session_type,
      session_label: parsed.session_label,
      focus: parsed.session_focus || null,
      interaction_mode: parsed.interaction_mode,
      status: "completed",
      transcript: parsed.transcript || null,
      summary: parsed.note_body,
      prompt_count: promptAnswers.length,
      answered_count: answeredCount,
      note_id: noteResult.data.id,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (sessionResult.error) throw sessionResult.error;

  if (promptAnswers.length) {
    const answerRows = promptAnswers.map((item) => ({
      session_id: sessionResult.data.id,
      user_id: user.id,
      prompt_index: item.prompt_index,
      prompt: item.prompt,
      answer: item.answer?.trim() || null,
      source: item.source ?? (parsed.interaction_mode === "voice" ? "voice" : "chat"),
    }));
    const { error } = await supabase.from("guided_session_answers").insert(answerRows);
    if (error) throw error;
  }

  if (parsed.transcript?.trim()) {
    const { error } = await supabase.from("guided_session_turns").insert({
      session_id: sessionResult.data.id,
      user_id: user.id,
      role: "student",
      modality: parsed.interaction_mode === "chat" ? "chat" : "voice",
      content: parsed.transcript,
      metadata: { source: "session_transcript" },
    });
    if (error) throw error;
  }

  revalidatePath("/dashboard");
}

export async function createActivity(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = activitySchema.parse({
    name: value(formData, "name"),
    role: value(formData, "role") || null,
    years: value(formData, "years") || null,
    impact: value(formData, "impact") || null,
  });

  await supabase.from("activities").insert({ ...parsed, user_id: user.id });
  revalidatePath("/dashboard");
}

export async function createAward(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = awardSchema.parse({
    name: value(formData, "name"),
    scope: value(formData, "scope") || null,
    year: value(formData, "year") || null,
  });

  await supabase.from("awards").insert({ ...parsed, user_id: user.id });
  revalidatePath("/dashboard");
}

export async function toggleTask(formData: FormData) {
  const { supabase } = await requireUser();
  const id = value(formData, "id");
  const status = value(formData, "status") === "done" ? "todo" : "done";

  await supabase.from("tasks").update({ status }).eq("id", id);
  revalidatePath("/dashboard");
}

export async function uploadDocument(formData: FormData) {
  const { supabase, user } = await requireUser();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return;
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${user.id}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage
    .from("student_uploads")
    .upload(path, file, { upsert: false });

  if (!error) {
    await supabase.from("documents").insert({
      user_id: user.id,
      file_name: file.name,
      storage_path: path,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
    });
  }

  revalidatePath("/dashboard");
}
