"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isAdminEmail } from "@/lib/env";
import {
  CURRENT_PRIORITY_VALUES,
  USER_IDENTITY_VALUES,
} from "@/lib/student-profile";
import { deriveMemoriesFromSession } from "@/lib/student-context";
import { createClient } from "@/lib/supabase/server";
import type { AdminInstruction } from "@/lib/types";

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
  session_focus: z.string().max(600).optional(),
  interaction_mode: z.enum(["voice", "chat", "mixed"]),
  transcript: z.string().max(20000).optional(),
  prompt_answers: z.string().optional(),
  note_title: z.string().min(2).max(120),
  note_body: z.string().min(2).max(6000),
  activity_id: z.string().uuid().optional(),
  award_id: z.string().uuid().optional(),
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
  name: z.string().min(1).max(160),
  category: z.string().max(120).optional(),
  position: z.string().max(160).optional(),
  description: z.string().max(2000).optional(),
  organization_description: z.string().max(2000).optional(),
  grades: z.array(z.string().max(20)).max(10).optional(),
  start_date: z.string().max(40).optional(),
  end_date: z.string().max(40).optional(),
  in_progress: z.boolean().optional(),
  hours_per_week: z.number().int().min(0).max(168).optional(),
  weeks_per_year: z.number().int().min(0).max(52).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
});

const updateActivitySchema = activitySchema.extend({ id: z.uuid() });

const awardSchema = z.object({
  name: z.string().min(2).max(160),
  scope: z.string().max(80).optional(),
  year: z.string().max(20).optional(),
});

const collegeListSchema = z.object({
  name: z.string().min(2).max(160),
  location: z.string().max(120).optional(),
  fit_reason: z.string().max(500).optional(),
  status: z
    .enum(["Dream", "Reach", "Match", "Necessity", "Getting Close", "Actualized", "Set Aside For Now"])
    .optional(),
  priority: z.enum(["High", "Medium", "Low"]).optional(),
  notes: z.string().max(1000).optional(),
});

const updateCollegeListSchema = collegeListSchema.extend({
  id: z.uuid(),
});

const profilePreferencesSchema = z.object({
  displayName: z.string().max(80).optional(),
  navLayout: z.enum(["left", "top"]).optional(),
  navCollapsed: z.boolean().optional(),
  topNavCollapsed: z.boolean().optional(),
  appearance: z.enum(["paper", "dark"]).optional(),
  fontFamily: z.enum(["serif", "sans"]).optional(),
});

const studentAdmissionsProfileSchema = z.object({
  dateOfBirth: z.string().max(10).optional(),
  userIdentity: z.enum(USER_IDENTITY_VALUES).or(z.literal("")).optional(),
  location: z.string().max(120).optional(),
  gradeLevel: z.string().max(60).optional(),
  currentPriority: z.enum(CURRENT_PRIORITY_VALUES).or(z.literal("")).optional(),
  coachingStyle: z.enum(["direct", "encouraging", "structured", "exploratory"]).optional(),
  personalityNotes: z.string().max(1200).optional(),
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

/** Coerce a possibly-fractional/invalid number to a rounded integer in range. */
function toIntInRange(n: unknown, min: number, max: number): number {
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, Math.round(num)));
}

function parsePromptAnswers(raw: string | undefined) {
  if (!raw) return [];

  try {
    return guidedPromptAnswerSchema.parse(JSON.parse(raw));
  } catch {
    return [];
  }
}

const weeklyChallengeSchema = z.object({
  title: z.string().min(2).max(200),
  category: z.string().max(80).optional(),
  description: z.string().max(2000).optional(),
  week_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function createWeeklyChallenge(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = weeklyChallengeSchema.parse({
    title: value(formData, "title"),
    category: value(formData, "category") || undefined,
    description: value(formData, "description") || undefined,
    week_start_date: value(formData, "week_start_date"),
  });
  await supabase.from("weekly_challenges").insert({ ...parsed, user_id: user.id });
  revalidatePath("/dashboard");
}

export async function updateWeeklyChallenge(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = value(formData, "id");
  if (!id) return;
  const updates: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };
  const title = value(formData, "title");
  const category = value(formData, "category");
  const description = value(formData, "description");
  if (title) updates.title = title;
  updates.category = category || null;
  updates.description = description || null;
  await supabase
    .from("weekly_challenges")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/dashboard");
}

export async function toggleWeeklyChallengeStatus(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = value(formData, "id");
  const currentStatus = value(formData, "status");
  if (!id) return;
  const nextStatus = currentStatus === "completed" ? "active" : "completed";
  await supabase
    .from("weekly_challenges")
    .update({
      status: nextStatus,
      completed_at: nextStatus === "completed" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/dashboard");
}

export async function deleteWeeklyChallenge(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = value(formData, "id");
  if (!id) return;
  await supabase.from("weekly_challenges").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/dashboard");
}

export async function updateNote(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = value(formData, "id");
  const title = value(formData, "title");
  const body = value(formData, "body");
  if (!id) return;
  await supabase
    .from("notes")
    .update({
      ...(title ? { title } : {}),
      ...(body ? { body } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/dashboard");
}

export async function deleteNote(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = value(formData, "id");
  if (!id) return;
  await supabase.from("notes").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/dashboard");
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
    activity_id: value(formData, "activity_id") || undefined,
    award_id: value(formData, "award_id") || undefined,
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
      activity_id: parsed.activity_id ?? null,
      award_id: parsed.award_id ?? null,
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

  const inferredMemories = deriveMemoriesFromSession({
    noteBody: parsed.note_body,
    sessionId: sessionResult.data.id,
    sessionLabel: parsed.session_label,
    transcript: parsed.transcript,
  });

  if (inferredMemories.length) {
    const { error } = await supabase.from("student_memories").insert(
      inferredMemories.map((memory) => ({
        ...memory,
        user_id: user.id,
      })),
    );
    if (error) {
      console.error("student memory inference save failed", error);
    }
  }

  revalidatePath("/dashboard");
}

/** Parses a JSON-stringified array of `{ title, target_date }` staged
 *  during new-activity / new-award creation. Filters out invalid rows. */
function parsePendingGoals(
  raw: string | undefined,
): Array<{ title: string; target_date?: string }> {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((g): g is { title: string; target_date?: string } => {
        return (
          g &&
          typeof g === "object" &&
          typeof g.title === "string" &&
          g.title.trim().length > 0
        );
      })
      .map((g) => ({
        title: g.title.trim().slice(0, 200),
        target_date:
          typeof g.target_date === "string" && g.target_date.match(/^\d{4}-\d{2}-\d{2}$/)
            ? g.target_date
            : undefined,
      }))
      .slice(0, 20);
  } catch {
    return [];
  }
}

function parseGrades(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((g): g is string => typeof g === "string") : [];
  } catch {
    return [];
  }
}

function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

function parseActivityFormData(formData: FormData) {
  return {
    name: value(formData, "name"),
    category: value(formData, "category") || undefined,
    position: value(formData, "position") || undefined,
    description: value(formData, "description") || undefined,
    organization_description: value(formData, "organization_description") || undefined,
    grades: parseGrades(value(formData, "grades")),
    start_date: value(formData, "start_date") || undefined,
    end_date: value(formData, "end_date") || undefined,
    in_progress: value(formData, "in_progress") === "true",
    hours_per_week: toIntInRange(value(formData, "hours_per_week"), 0, 168),
    weeks_per_year: toIntInRange(value(formData, "weeks_per_year"), 0, 52),
    tags: parseTags(value(formData, "tags")),
  };
}

export async function createActivity(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = activitySchema.parse(parseActivityFormData(formData));

  // Also fill legacy columns so other parts of the app keep working.
  const inserted = await supabase
    .from("activities")
    .insert({
      ...parsed,
      user_id: user.id,
      role: parsed.position,
      impact: parsed.description,
      years:
        parsed.start_date && parsed.end_date
          ? `${parsed.start_date} – ${parsed.end_date}`
          : parsed.start_date || null,
    })
    .select("id")
    .single();

  // If the editor staged any goals (added before the activity existed in DB),
  // create them now with the new activity_id.
  const pendingGoals = parsePendingGoals(value(formData, "pending_goals"));
  if (inserted.data && pendingGoals.length) {
    await supabase.from("goals").insert(
      pendingGoals.map((g) => ({
        user_id: user.id,
        title: g.title,
        target_date: g.target_date || null,
        activity_id: inserted.data.id,
        status: "active",
      })),
    );
  }

  revalidatePath("/dashboard");
}

export async function updateActivity(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = updateActivitySchema.parse({
    id: value(formData, "id"),
    ...parseActivityFormData(formData),
  });
  const { id, ...updates } = parsed;

  await supabase
    .from("activities")
    .update({
      ...updates,
      role: updates.position,
      impact: updates.description,
      years: updates.start_date && updates.end_date
        ? `${updates.start_date} – ${updates.end_date}`
        : updates.start_date || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/dashboard");
}

export async function deleteActivity(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = value(formData, "id");
  if (!id) return;
  await supabase.from("activities").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/dashboard");
}

export async function tagNoteToActivity(formData: FormData) {
  const { supabase, user } = await requireUser();
  const noteId = value(formData, "note_id");
  const activityIdRaw = value(formData, "activity_id");
  const activityId = activityIdRaw || null;
  if (!noteId) return;
  await supabase
    .from("notes")
    .update({ activity_id: activityId, updated_at: new Date().toISOString() })
    .eq("id", noteId)
    .eq("user_id", user.id);
  revalidatePath("/dashboard");
}

export async function reorderActivities(formData: FormData) {
  const { supabase, user } = await requireUser();
  const raw = value(formData, "order");
  let ids: string[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) ids = parsed.filter((x): x is string => typeof x === "string");
  } catch { return; }
  if (!ids.length) return;

  // Assign incrementing sort_order in the supplied sequence.
  await Promise.all(
    ids.map((id, index) =>
      supabase
        .from("activities")
        .update({ sort_order: index, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id),
    ),
  );
  revalidatePath("/dashboard");
}

export async function reorderAwards(formData: FormData) {
  const { supabase, user } = await requireUser();
  const raw = value(formData, "order");
  let ids: string[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) ids = parsed.filter((x): x is string => typeof x === "string");
  } catch { return; }
  if (!ids.length) return;

  await Promise.all(
    ids.map((id, index) =>
      supabase
        .from("awards")
        .update({ sort_order: index, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id),
    ),
  );
  revalidatePath("/dashboard");
}

const awardFullSchema = z.object({
  name: z.string().min(1).max(200),
  organization: z.string().max(200).optional(),
  scope: z.string().max(120).optional(),
  level: z.string().max(80).optional(),
  year: z.string().max(40).optional(),
  description: z.string().max(2000).optional(),
  requirements: z.string().max(2000).optional(),
  activity_id: z.string().uuid().optional().nullable(),
  tags: z.array(z.string().max(40)).max(20).optional(),
});

const updateAwardFullSchema = awardFullSchema.extend({ id: z.uuid() });

function parseAwardFormData(formData: FormData) {
  const activityId = value(formData, "activity_id");
  return {
    name: value(formData, "name"),
    organization: value(formData, "organization") || undefined,
    scope: value(formData, "scope") || undefined,
    level: value(formData, "level") || undefined,
    year: value(formData, "year") || undefined,
    description: value(formData, "description") || undefined,
    requirements: value(formData, "requirements") || undefined,
    activity_id: activityId || null,
    tags: parseTags(value(formData, "tags")),
  };
}

export async function createAwardFull(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = awardFullSchema.parse(parseAwardFormData(formData));
  const inserted = await supabase
    .from("awards")
    .insert({ ...parsed, user_id: user.id })
    .select("id")
    .single();

  const pendingGoals = parsePendingGoals(value(formData, "pending_goals"));
  if (inserted.data && pendingGoals.length) {
    await supabase.from("goals").insert(
      pendingGoals.map((g) => ({
        user_id: user.id,
        title: g.title,
        target_date: g.target_date || null,
        award_id: inserted.data.id,
        status: "active",
      })),
    );
  }

  revalidatePath("/dashboard");
}

export async function updateAwardFull(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = updateAwardFullSchema.parse({
    id: value(formData, "id"),
    ...parseAwardFormData(formData),
  });
  const { id, ...updates } = parsed;
  await supabase
    .from("awards")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/dashboard");
}

export async function deleteAward(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = value(formData, "id");
  if (!id) return;
  await supabase.from("awards").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/dashboard");
}

type ExtractedActivity = {
  name?: string;
  category?: string;
  position?: string;
  description?: string;
  grades?: string[];
  start_date?: string;
  end_date?: string;
  in_progress?: boolean;
  hours_per_week?: number;
  weeks_per_year?: number;
  tags?: string[];
};

async function extractFileText(file: File): Promise<{ text?: string; error?: string }> {
  const buf = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  // PDF — uses pdf-parse v2 (built on pdfjs-dist)
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    try {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buf) });
      const result = await parser.getText();
      await parser.destroy();
      const text = result.text?.trim();
      if (!text) return { error: "Could not extract text from this PDF." };
      return { text };
    } catch (e) {
      return {
        error: `PDF parsing failed: ${e instanceof Error ? e.message : "unknown error"}`,
      };
    }
  }

  // DOCX — uses mammoth
  if (
    name.endsWith(".docx") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: buf });
      const text = result.value?.trim();
      if (!text) return { error: "Could not extract text from this Word document." };
      return { text };
    } catch (e) {
      return {
        error: `DOCX parsing failed: ${e instanceof Error ? e.message : "unknown error"}`,
      };
    }
  }

  // Plain text fallback
  if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
    return { text: buf.toString("utf-8") };
  }

  return {
    error: `Unsupported file type: ${file.name}. Use PDF, DOCX, or TXT.`,
  };
}

export async function importActivitiesFromText(formData: FormData) {
  const { supabase, user } = await requireUser();

  // Accept either pasted text or an uploaded file (PDF / DOCX / TXT).
  let text = value(formData, "text");
  const file = formData.get("file");
  if (!text && file instanceof File && file.size > 0) {
    const extracted = await extractFileText(file);
    if (extracted.error) return { ok: false as const, error: extracted.error };
    text = extracted.text ?? "";
  }

  if (!text || text.length < 20) {
    return { ok: false as const, error: "Please paste at least a short resume snippet." };
  }
  if (!process.env.OPENAI_API_KEY) {
    return { ok: false as const, error: "Resume parsing requires OPENAI_API_KEY." };
  }

  const systemPrompt = `You parse high school resumes / activity lists into structured JSON for a college application workspace.
Return ONLY valid JSON matching this shape (no prose, no markdown fence):
{ "activities": [ {
  "name": string,
  "category": one of ["Academic","Art","Athletic - Club","Athletic - JV/Varsity","Career-Oriented","Community Service (Volunteer)","Computer/Technology","Cultural","Dance","Debate/Speech","Environmental","Family Responsibilities","Foreign Exchange","Internship","Journalism/Publication","LGBT","Music: Instrumental","Music: Vocal","Religious","Research","Robotics","School Spirit","Science/Math","Social Justice","Speech & Debate","Student Govt./Politics","Theater/Drama","Work (Paid)","Other Club/Activity"],
  "position": string,
  "description": string (rich, multiple sentences if possible),
  "grades": array of strings from ["9","10","11","12","Post-Graduate","N/A"],
  "start_date": "YYYY-MM" or "",
  "end_date": "YYYY-MM" or "",
  "in_progress": boolean,
  "hours_per_week": number,
  "weeks_per_year": number,
  "tags": array of short strings (e.g. ["Leadership","Service","STEM","Humanities"])
} ] }
Use best inference. Leave fields blank/zero/empty array if not specified.`;

  let parsed: { activities?: ExtractedActivity[] };
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text.slice(0, 12000) },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false as const, error: `OpenAI error: ${body.slice(0, 200)}` };
    }
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    parsed = JSON.parse(content);
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Parse failed",
    };
  }

  const activities = (parsed.activities ?? []).filter((a) => a.name?.trim());
  if (!activities.length) {
    return { ok: false as const, error: "No activities detected. Try pasting more detail." };
  }

  // Find the current max sort_order so the imports stack at the end.
  const { data: existing } = await supabase
    .from("activities")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1);
  let nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const rows = activities.map((a) => ({
    user_id: user.id,
    name: a.name?.trim() ?? "Untitled",
    category: a.category ?? null,
    position: a.position ?? null,
    description: a.description ?? null,
    role: a.position ?? null,
    impact: a.description ?? null,
    years:
      a.start_date && a.end_date
        ? `${a.start_date} – ${a.end_date}`
        : a.start_date || null,
    grades: a.grades ?? [],
    start_date: a.start_date || null,
    end_date: a.end_date || null,
    in_progress: a.in_progress ?? false,
    // The model may return fractional hours (e.g. 0.5). These columns are
    // integers, so round and clamp to valid ranges.
    hours_per_week: toIntInRange(a.hours_per_week, 0, 168),
    weeks_per_year: toIntInRange(a.weeks_per_year, 0, 52),
    tags: a.tags ?? [],
    sort_order: nextOrder++,
  }));

  const { error } = await supabase.from("activities").insert(rows);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/dashboard");
  return { ok: true as const, count: rows.length };
}

const linkedGoalSchema = z.object({
  title: z.string().min(2).max(200),
  target_date: z.string().optional(),
  activity_id: z.string().uuid().optional().nullable(),
  award_id: z.string().uuid().optional().nullable(),
});

export async function createLinkedGoal(formData: FormData) {
  const { supabase, user } = await requireUser();
  const activityIdRaw = value(formData, "activity_id");
  const awardIdRaw = value(formData, "award_id");
  const parsed = linkedGoalSchema.parse({
    title: value(formData, "title"),
    target_date: value(formData, "target_date") || undefined,
    activity_id: activityIdRaw || null,
    award_id: awardIdRaw || null,
  });

  await supabase.from("goals").insert({
    user_id: user.id,
    title: parsed.title,
    target_date: parsed.target_date || null,
    activity_id: parsed.activity_id,
    award_id: parsed.award_id,
    status: "active",
  });
  revalidatePath("/dashboard");
}

export async function updateLinkedGoal(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = value(formData, "id");
  const title = value(formData, "title");
  const targetDate = value(formData, "target_date");
  if (!id || !title) return;
  await supabase
    .from("goals")
    .update({
      title,
      target_date: targetDate || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/dashboard");
}

export async function toggleGoalStatus(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = value(formData, "id");
  const currentStatus = value(formData, "status");
  if (!id) return;
  const nextStatus = currentStatus === "achieved" ? "active" : "achieved";
  await supabase
    .from("goals")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/dashboard");
}

export async function deleteGoal(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = value(formData, "id");
  if (!id) return;
  await supabase.from("goals").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/dashboard");
}

export async function createNoteForActivity(formData: FormData) {
  const { supabase, user } = await requireUser();
  const title = value(formData, "title");
  const body = value(formData, "body");
  const activityId = value(formData, "activity_id") || null;
  if (!title || !body) return;
  await supabase.from("notes").insert({
    user_id: user.id,
    title,
    body,
    category: "Reflection",
    activity_id: activityId,
  });
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

export async function createCollegeListEntry(formData: FormData) {
  const { supabase, user } = await requireUser();
  // Empty fields → undefined so Zod's `.optional()` accepts them. Using
  // `|| null` here previously caused Zod to reject the parse because
  // `z.string().optional()` allows `undefined` but NOT `null`.
  const parsed = collegeListSchema.parse({
    name: value(formData, "name"),
    location: value(formData, "location") || undefined,
    fit_reason: value(formData, "fit_reason") || undefined,
    status: value(formData, "status") || "Dream",
    priority: value(formData, "priority") || "Medium",
    notes: value(formData, "notes") || undefined,
  });

  const { error } = await supabase.from("college_list").insert({
    ...parsed,
    user_id: user.id,
    source: "manual",
    last_mentioned_at: new Date().toISOString(),
  });
  if (error) {
    console.error("createCollegeListEntry insert failed:", error);
    throw new Error(error.message);
  }
  revalidatePath("/dashboard");
}

export async function deleteCollegeListEntry(formData: FormData) {
  const { supabase } = await requireUser();
  const id = value(formData, "id");
  if (!id) throw new Error("Missing target id.");
  const { error } = await supabase.from("college_list").delete().eq("id", id);
  if (error) {
    console.error("deleteCollegeListEntry failed:", error);
    throw new Error(error.message);
  }
  revalidatePath("/dashboard");
}

export async function updateCollegeListEntry(formData: FormData) {
  const { supabase } = await requireUser();
  const parsed = updateCollegeListSchema.parse({
    id: value(formData, "id"),
    name: value(formData, "name"),
    location: value(formData, "location") || undefined,
    fit_reason: value(formData, "fit_reason") || undefined,
    status: value(formData, "status") || "Dream",
    priority: value(formData, "priority") || "Medium",
    notes: value(formData, "notes") || undefined,
  });
  const { id, ...updates } = parsed;

  const { error } = await supabase
    .from("college_list")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    console.error("updateCollegeListEntry failed:", error);
    throw new Error(error.message);
  }
  revalidatePath("/dashboard");
}

export async function toggleTask(formData: FormData) {
  const { supabase } = await requireUser();
  const id = value(formData, "id");
  const status = value(formData, "status") === "done" ? "todo" : "done";

  await supabase.from("tasks").update({ status }).eq("id", id);
  revalidatePath("/dashboard");
}

export async function updateProfilePreferences(input: z.input<typeof profilePreferencesSchema>) {
  const { supabase, user } = await requireUser();
  const parsed = profilePreferencesSchema.parse(input);
  const updates: Record<string, string | boolean> = {
    updated_at: new Date().toISOString(),
  };

  if ("displayName" in parsed) updates.display_name = parsed.displayName?.trim() ?? "";
  if (parsed.navLayout) updates.nav_layout = parsed.navLayout;
  if (typeof parsed.navCollapsed === "boolean") updates.nav_collapsed = parsed.navCollapsed;
  if (typeof parsed.topNavCollapsed === "boolean") {
    updates.top_nav_collapsed = parsed.topNavCollapsed;
  }
  if (parsed.appearance) updates.appearance = parsed.appearance;
  if (parsed.fontFamily) updates.font_family = parsed.fontFamily;

  // Upsert with explicit conflict target on the primary key so existing rows
  // are updated rather than rejected as duplicates.
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, ...updates }, { onConflict: "id" });

  if (error) {
    console.error("updateProfilePreferences failed", error);
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function updateStudentAdmissionsProfile(
  input: z.input<typeof studentAdmissionsProfileSchema>,
) {
  const { supabase, user } = await requireUser();
  const parsed = studentAdmissionsProfileSchema.parse(input);

  const { error } = await supabase.from("student_admissions_profiles").upsert(
    {
      user_id: user.id,
      date_of_birth: parsed.dateOfBirth?.trim() || null,
      user_identity: parsed.userIdentity || null,
      location: parsed.location?.trim() || null,
      grade_level: parsed.gradeLevel?.trim() || null,
      current_priority: parsed.currentPriority || null,
      coaching_style: parsed.coachingStyle ?? "encouraging",
      personality_notes: parsed.personalityNotes?.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("updateStudentAdmissionsProfile failed", error);
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/dashboard");
  return { ok: true as const };
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

// ── Administrator: global AI instructions ────────────────────────────────────

const adminTextInstructionSchema = z.object({
  title: z.string().max(120).optional(),
  content: z.string().min(2).max(8000),
});

async function getAdminContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  if (!isAdminEmail(user.email)) return null;
  return { supabase, user };
}

export async function listAdminInstructions(): Promise<{
  isAdmin: boolean;
  items: AdminInstruction[];
}> {
  const admin = await getAdminContext();
  if (!admin) return { isAdmin: false, items: [] };

  const { data } = await admin.supabase
    .from("admin_ai_instructions")
    .select("id,source,title,content,file_name,created_at")
    .order("created_at", { ascending: false });

  return { isAdmin: true, items: (data ?? []) as AdminInstruction[] };
}

export async function addAdminTextInstruction(
  input: z.input<typeof adminTextInstructionSchema>,
) {
  const admin = await getAdminContext();
  if (!admin) return { ok: false as const, error: "Not authorized." };

  const parsed = adminTextInstructionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Please enter instruction text." };
  }

  const { error } = await admin.supabase.from("admin_ai_instructions").insert({
    source: "text",
    title: parsed.data.title?.trim() || null,
    content: parsed.data.content.trim(),
    created_by: admin.user.id,
  });

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function addAdminDocumentInstruction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) return { ok: false as const, error: "Not authorized." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "Choose a PDF, DOCX, or TXT file." };
  }

  const extracted = await extractFileText(file);
  if (extracted.error) return { ok: false as const, error: extracted.error };
  const content = extracted.text?.trim();
  if (!content) {
    return { ok: false as const, error: "No readable text found in that file." };
  }

  const title = value(formData, "title");
  const { error } = await admin.supabase.from("admin_ai_instructions").insert({
    source: "document",
    title: title || null,
    content: content.slice(0, 8000),
    file_name: file.name,
    created_by: admin.user.id,
  });

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function deleteAdminInstruction(id: string) {
  const admin = await getAdminContext();
  if (!admin) return { ok: false as const, error: "Not authorized." };

  const { error } = await admin.supabase
    .from("admin_ai_instructions")
    .delete()
    .eq("id", id);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true as const };
}
