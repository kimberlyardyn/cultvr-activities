import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";

import { signOut } from "@/app/actions";
import { ChatPanel } from "@/components/chat-panel";
import { DashboardCard } from "@/components/dashboard-card";
import {
  ActivitiesList,
  GoalsList,
  NotesList,
  TasksList,
} from "@/components/dashboard-lists";
import { QuickAddForms } from "@/components/quick-add-forms";
import { VoicePanel } from "@/components/voice-panel";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Activity, Goal, Note, StudentTask } from "@/lib/types";

export default async function DashboardPage() {
  if (!hasSupabaseEnv()) {
    return <MissingConfig />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [notes, goals, tasks, activities] = await Promise.all([
    supabase
      .from("notes")
      .select("id,title,body,category,created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("goals")
      .select("id,title,status,target_date,created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("tasks")
      .select("id,title,status,due_date,created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("activities")
      .select("id,name,role,impact,years,created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-6">
      <header className="flex flex-col gap-4 border-b border-black/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link className="text-sm font-semibold text-[#355c46]" href="/">
            Cultvr
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#17201b]">
            Student command center
          </h1>
          <p className="mt-2 text-sm text-[#65726b]">
            Signed in as {user.email}
          </p>
        </div>
        <form action={signOut}>
          <button className="flex h-10 items-center gap-2 rounded-md border border-black/15 bg-white px-4 text-sm font-semibold text-[#17201b] hover:bg-[#f2f4ef]">
            <LogOut size={16} />
            Sign out
          </button>
        </form>
      </header>

      <section className="grid gap-5 py-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-5">
          <DashboardCard
            description="Capture structured records that become the source material for essays, plans, and counseling conversations."
            title="Quick capture"
          >
            <QuickAddForms />
          </DashboardCard>

          <DashboardCard
            description="Use text chat to brainstorm achievements, turn rough notes into next steps, and pressure-test essay angles."
            title="AI chat counselor"
          >
            <ChatPanel />
          </DashboardCard>
        </div>

        <div className="grid gap-5">
          <DashboardCard
            description="Talk through wins, blockers, and plans. The realtime endpoint uses a short-lived client token."
            title="Voice session"
          >
            <VoicePanel />
          </DashboardCard>

          <DashboardCard title="Tasks">
            <TasksList tasks={(tasks.data ?? []) as StudentTask[]} />
          </DashboardCard>

          <DashboardCard title="Goals">
            <GoalsList goals={(goals.data ?? []) as Goal[]} />
          </DashboardCard>
        </div>
      </section>

      <section className="grid gap-5 pb-10 lg:grid-cols-2">
        <DashboardCard title="Recent notes">
          <NotesList notes={(notes.data ?? []) as Note[]} />
        </DashboardCard>
        <DashboardCard title="Activities">
          <ActivitiesList activities={(activities.data ?? []) as Activity[]} />
        </DashboardCard>
      </section>
    </main>
  );
}

function MissingConfig() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-10">
      <section className="rounded-lg border border-black/10 bg-white p-6 shadow-sm">
        <Link className="text-sm font-semibold text-[#355c46]" href="/">
          Cultvr
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[#17201b]">
          Supabase is not configured yet.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#65726b]">
          Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to
          `.env.local`, then apply `supabase/schema.sql` in your Supabase SQL
          editor.
        </p>
      </section>
    </main>
  );
}
