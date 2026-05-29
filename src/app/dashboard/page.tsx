import Link from "next/link";
import { redirect } from "next/navigation";

import { AlmanacWorkspace } from "@/components/almanac-workspace";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type {
  Activity,
  Award,
  CollegeListEntry,
  Goal,
  GuidedSession,
  Note,
  ProfilePreferences,
  StudentAdmissionsProfile,
  StudentMemory,
  StudentTask,
  WeeklyChallenge,
} from "@/lib/types";

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

  const [
    profile,
    studentProfile,
    studentMemories,
    notes,
    goals,
    tasks,
    activities,
    awards,
    collegeList,
    guidedSessions,
    weeklyChallenges,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,display_name,nav_layout,nav_collapsed,top_nav_collapsed,appearance,font_family")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("student_admissions_profiles")
      .select(
        "user_id,grade_level,application_stage,intended_majors,interests,current_priorities,target_colleges,important_deadlines,coaching_style,personality_notes,created_at,updated_at",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("student_memories")
      .select("id,user_id,memory_type,label,summary,confidence,source_session_id,status,created_at,updated_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("notes")
      .select("id,title,body,category,activity_id,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("goals")
      .select("id,title,status,target_date,activity_id,award_id,created_at")
      .order("target_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("tasks")
      .select("id,title,status,due_date,created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("activities")
      .select(
        "id,name,role,impact,years,category,position,description,organization_description,grades,start_date,end_date,in_progress,hours_per_week,weeks_per_year,tags,sort_order,created_at",
      )
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("awards")
      .select("id,name,scope,year,organization,description,requirements,level,activity_id,tags,sort_order,created_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("college_list")
      .select(
        "id,name,location,fit_reason,status,priority,notes,source,last_mentioned_at,created_at,updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("guided_sessions")
      .select(
        "id,session_type,session_label,focus,interaction_mode,status,transcript,summary,prompt_count,answered_count,note_id,goal_id,task_id,started_at,completed_at,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("weekly_challenges")
      .select("id,title,category,description,week_start_date,status,completed_at,created_at,updated_at")
      .order("week_start_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  return (
    <AlmanacWorkspace
      activities={(activities.data ?? []) as Activity[]}
      awards={(awards.data ?? []) as Award[]}
      collegeList={(collegeList.data ?? []) as CollegeListEntry[]}
      goals={(goals.data ?? []) as Goal[]}
      guidedSessions={(guidedSessions.data ?? []) as GuidedSession[]}
      notes={(notes.data ?? []) as Note[]}
      profile={(profile.data ?? null) as ProfilePreferences | null}
      studentMemories={(studentMemories.data ?? []) as StudentMemory[]}
      studentProfile={(studentProfile.data ?? null) as StudentAdmissionsProfile | null}
      tasks={(tasks.data ?? []) as StudentTask[]}
      weeklyChallenges={(weeklyChallenges.data ?? []) as WeeklyChallenge[]}
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
