"use client";

import { ArrowRight, KeyRound, Mail, UserRound } from "lucide-react";
import { useState, type InputHTMLAttributes, type ReactNode } from "react";

import {
  signInWithMagicLink,
  signInWithPassword,
  signUpWithPassword,
} from "@/app/login/actions";

type AuthMode = "signin" | "signup" | "magic";

type LoginAuthCardProps = {
  message?: string;
};

const modes: Array<{ id: AuthMode; label: string }> = [
  { id: "signin", label: "Sign in" },
  { id: "signup", label: "Create" },
  { id: "magic", label: "Magic link" },
];

export function LoginAuthCard({ message }: LoginAuthCardProps) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const action =
    mode === "signup"
      ? signUpWithPassword
      : mode === "magic"
        ? signInWithMagicLink
        : signInWithPassword;

  return (
    <section className="rounded-[1.75rem] border border-[#1F2433]/10 bg-[#F6F0E8]/90 p-3 shadow-[0_24px_80px_rgba(31,36,51,0.12)] backdrop-blur">
      <div className="rounded-[1.35rem] border border-white/70 bg-white/35 p-4 sm:p-6">
        <div className="border-b border-[#1F2433]/10 pb-5">
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[#1F2433]/55">
            Student access
          </p>
          <h2 className="mt-2 font-serif text-3xl leading-tight text-[#1F2433] sm:text-4xl">
            {mode === "signup"
              ? "Create your workspace"
              : mode === "magic"
                ? "Email yourself a link"
                : "Welcome back"}
          </h2>

          <div className="mt-5 grid w-full grid-cols-3 rounded-full border border-[#1F2433]/10 bg-[#E4DDD4] p-1">
            {modes.map((item) => {
              const active = item.id === mode;
              return (
                <button
                  className={[
                    "h-10 min-w-0 rounded-full px-2 text-sm font-medium leading-none transition sm:px-3",
                    active
                      ? "bg-[#1F2433] text-[#F6F0E8]"
                      : "text-[#1F2433]/58 hover:text-[#1F2433]",
                  ].join(" ")}
                  key={item.id}
                  onClick={() => setMode(item.id)}
                  type="button"
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {message ? (
          <div className="mt-5 rounded-xl border border-[#9CAD93]/35 bg-[#EEF3EA] px-4 py-3 text-sm leading-6 text-[#355c46]">
            {message}
          </div>
        ) : null}

        <form action={action} className="mt-5 grid gap-4">
          {mode === "signup" ? (
            <Field
              autoComplete="name"
              icon={<UserRound size={17} />}
              label="Student name"
              name="fullName"
              placeholder="Your name"
              required
            />
          ) : null}

          <Field
            autoComplete="email"
            icon={<Mail size={17} />}
            label="Email"
            name="email"
            placeholder="you@example.com"
            required
            type="email"
          />

          {mode !== "magic" ? (
            <Field
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              icon={<KeyRound size={17} />}
              label="Password"
              minLength={mode === "signup" ? 8 : undefined}
              name="password"
              placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
              required
              type="password"
            />
          ) : null}

          <button className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#1F2433] px-5 text-sm font-medium text-[#F6F0E8] transition hover:bg-[#0F1322]">
            {mode === "signup" ? "Create account" : mode === "magic" ? "Send magic link" : "Sign in"}
            <ArrowRight size={16} />
          </button>
        </form>

        <p className="mt-5 text-sm leading-6 text-[#1F2433]/62">
          {mode === "signup"
            ? "You may need to confirm your email before entering the workspace."
            : mode === "magic"
              ? "Use this when you do not want to type a password."
              : "Use your password, or switch to magic link for email-only access."}
        </p>
      </div>
    </section>
  );
}

function Field({
  icon,
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  icon: ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-[#1F2433]/72">{label}</span>
      <span className="flex h-12 items-center gap-3 rounded-xl border border-[#1F2433]/12 bg-white/70 px-3 text-[#1F2433]/55 transition focus-within:border-[#3F4A66] focus-within:bg-white">
        {icon}
        <input
          className="min-w-0 flex-1 bg-transparent text-sm text-[#1F2433] outline-none placeholder:text-[#1F2433]/38"
          {...props}
        />
      </span>
    </label>
  );
}
