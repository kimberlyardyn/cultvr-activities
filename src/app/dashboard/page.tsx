import Link from "next/link";
import { redirect } from "next/navigation";

import { AlmanacWorkspace } from "@/components/almanac-workspace";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Activity, Award, Goal, Note, StudentTask } from "@/lib/types";

const dashboardTabs = new Set([
  "overview",
  "sessions",
  "action-plan",
  "activities",
  "goals",
  "timeline",
  "discover",
]);

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  if (!hasSupabaseEnv()) {
    return <MissingConfig />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const { tab } = await searchParams;
  const initialTab = dashboardTabs.has(tab ?? "") ? tab : undefined;

  const [notes, goals, tasks, activities, awards] = await Promise.all([
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
    supabase
      .from("awards")
      .select("id,name,scope,year,created_at")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  return (
    <AlmanacWorkspace
      activities={(activities.data ?? []) as Activity[]}
      awards={(awards.data ?? []) as Award[]}
      goals={(goals.data ?? []) as Goal[]}
      notes={(notes.data ?? []) as Note[]}
      tasks={(tasks.data ?? []) as StudentTask[]}
      userEmail={user.email ?? null}
      initialTab={initialTab}
    />
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
