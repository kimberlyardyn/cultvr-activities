import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function loginWithMessage(request: Request, message: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("message", message);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error_description") ?? requestUrl.searchParams.get("error");

  // Supabase can hand back an error (cancelled, expired, etc.) instead of a code.
  if (error) {
    return loginWithMessage(request, error);
  }

  if (!code) {
    return loginWithMessage(
      request,
      "That confirmation link is invalid. Please request a new one.",
    );
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return loginWithMessage(
      request,
      "That confirmation link has expired or was already used. Please request a new one.",
    );
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
