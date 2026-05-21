"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function formValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectWithMessage(message: string) {
  redirect(`/login?message=${encodeURIComponent(message)}`);
}

export async function signInWithPassword(formData: FormData) {
  const email = formValue(formData, "email");
  const password = formValue(formData, "password");
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) redirectWithMessage(error.message);
  redirect("/dashboard");
}

export async function signUpWithPassword(formData: FormData) {
  const email = formValue(formData, "email");
  const password = formValue(formData, "password");
  const fullName = formValue(formData, "fullName");
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: { full_name: fullName },
    },
  });

  if (error) redirectWithMessage(error.message);
  redirectWithMessage("Check your email to confirm your account.");
}

export async function signInWithMagicLink(formData: FormData) {
  const email = formValue(formData, "email");
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) redirectWithMessage(error.message);
  redirectWithMessage("Magic link sent. Check your email.");
}
