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

const activitySchema = z.object({
  name: z.string().min(2).max(160),
  role: z.string().max(160).optional(),
  years: z.string().max(80).optional(),
  impact: z.string().max(1200).optional(),
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
