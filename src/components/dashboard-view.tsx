"use client";

import { Award as AwardIcon, BookOpen, ListTodo, Mic, Plus, Settings, Sparkles, Target, TrendingUp, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";

import { ActivitiesTab } from "@/components/activities-tab";
import { AwardsTab } from "@/components/awards-tab";
import { toast } from "@/components/toast";
import { WeeklyChallengeTab } from "@/components/weekly-challenge-tab";
import {
  createCollegeListEntry,
  deleteCollegeListEntry,
  updateCollegeListEntry,
} from "@/app/dashboard/actions";
import {
  dashboardDemo,
  type ActivityPipelineItem,
  type CollegeListItem,
  type DashboardModel,
  type DashboardTab,
  type EssaySeed,
  type KnowledgeGraph,
  type KnowledgeGraphNode,
  type ProfileDepth,
  type ProfileDepthBreakdown,
  type ReadinessArea,
  type ReflectionCard,
  type StorySignal,
  type WeeklyAction,
} from "@/components/dashboard-model";
import type {
  Activity,
  Award,
  CollegeListEntry,
  Goal,
  GuidedSession,
  Note,
  StudentAdmissionsProfile,
  StudentMemory,
  StudentTask,
  WeeklyChallenge,
} from "@/lib/types";
import { currentPriorityLabel } from "@/lib/student-profile";
import { formatDate } from "@/lib/utils";

type DashboardViewProps = {
  awards: Award[];
  firstName: string;
  goals: Goal[];
  guidedSessions: GuidedSession[];
  notes: Note[];
  onNavigateTab?: (tab: "sessions" | "action-plan") => void;
  tasks: StudentTask[];
  activities: Activity[];
  collegeList: CollegeListEntry[];
  studentMemories: StudentMemory[];
  studentProfile: StudentAdmissionsProfile | null;
  weeklyChallenges: WeeklyChallenge[];
};

const tabs: Array<{ id: DashboardTab; label: string; icon: typeof Sparkles }> = [
  { id: "continue", label: "Workspace", icon: Sparkles },
  { id: "story-activities", label: "Activities", icon: BookOpen },
  { id: "awards", label: "Awards", icon: AwardIcon },
  { id: "weekly-challenge", label: "Weekly Challenge", icon: ListTodo },
  { id: "college-list", label: "Targets", icon: Target },
  { id: "application-readiness", label: "Progress", icon: TrendingUp },
];

const collegeStatuses = [
  "Dream",
  "Reach",
  "Match",
  "Necessity",
  "Getting Close",
  "Actualized",
  "Set Aside For Now",
] as const;

const activeStatuses = ["Dream", "Reach", "Match", "Necessity", "Getting Close"] as const;
const closedStatuses = ["Actualized", "Set Aside For Now"] as const;

const statusColors: Record<(typeof collegeStatuses)[number], string> = {
  Dream: "#E0B26B",
  Reach: "#C97A5D",
  Match: "#7A86A8",
  Necessity: "#3F4A66",
  "Getting Close": "#3F7D4A",
  Actualized: "#5e8a64",
  "Set Aside For Now": "#9a9a9a",
};

const collegePriorities = ["High", "Medium", "Low"] as const;

export function DashboardView({
  awards,
  firstName,
  goals,
  guidedSessions,
  notes,
  onNavigateTab,
  studentMemories,
  studentProfile,
  tasks,
  activities,
  collegeList,
  weeklyChallenges,
}: DashboardViewProps) {
  const model = useMemo(
    () =>
      buildDashboardModel({
        awards,
        goals,
        guidedSessions,
        notes,
        studentMemories,
        tasks,
        activities,
        collegeList,
      }),
    [activities, awards, collegeList, goals, guidedSessions, notes, studentMemories, tasks],
  );
  const [activeTab, setActiveTab] = useState<DashboardTab>("continue");

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        title={
          <>
            Your{" "}
            <em className="font-serif italic text-[color:var(--almanac-butter)]">
              workspace
            </em>
          </>
        }
      />

      <div className="px-5 pt-5 md:px-9">
        <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-1">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                className={[
                  "inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition",
                  active
                    ? "bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]"
                    : "text-[color:var(--almanac-ink-soft)] hover:text-[color:var(--almanac-ink)]",
                ].join(" ")}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <tab.icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-9">
        {activeTab === "continue" ? (
          <ContinueTab
            firstName={firstName}
            model={model}
            onNavigateTab={onNavigateTab}
            activities={activities}
            awards={awards}
          />
        ) : null}
        {activeTab === "story-activities" ? <ActivitiesTab activities={activities} awards={awards} notes={notes} goals={goals} /> : null}
        {activeTab === "awards" ? <AwardsTab awards={awards} activities={activities} goals={goals} /> : null}
        {activeTab === "weekly-challenge" ? (
          <WeeklyChallengeTab challenges={weeklyChallenges} />
        ) : null}
        {activeTab === "college-list" ? <CollegeListTab model={model} /> : null}
        {activeTab === "application-readiness" ? (
          <ProgressTab
            activities={activities}
            awards={awards}
            collegeList={collegeList}
            goals={goals}
            guidedSessions={guidedSessions}
            model={model}
            notes={notes}
            studentMemories={studentMemories}
            studentProfile={studentProfile}
            weeklyChallenges={weeklyChallenges}
          />
        ) : null}
      </div>
    </div>
  );
}

function ContinueTab({
  firstName,
  model,
  onNavigateTab,
  activities,
  awards,
}: {
  firstName: string;
  model: DashboardModel;
  onNavigateTab?: (tab: "sessions" | "action-plan") => void;
  activities: Activity[];
  awards: Award[];
}) {
  return (
    <div className="flex w-full flex-col gap-5">
      <section className="w-full rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-ink)] p-5 text-[color:var(--almanac-paper)] md:p-6">
        <h2 className="max-w-3xl font-serif text-4xl leading-[1.02] md:text-5xl">
          Welcome back,{" "}
          <em className="italic text-[color:var(--almanac-butter)]">
            {firstName}
          </em>
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-white/70">
          Continue where you left off.
        </p>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-white/72">
          {model.continuePanel.heroSummary}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <PrimaryButton onClick={() => onNavigateTab?.("sessions")}>
            <Mic size={15} />
            Start session
          </PrimaryButton>
        </div>
      </section>

      <ProfileDepthOverview activities={activities} awards={awards} />

      <KnowledgeGraphPanel graph={model.knowledgeGraph} />
    </div>
  );
}

function StoryActivitiesTab() {
  return <ComingSoonPanel kicker="Activities" title="Coming soon" />;
}

function ComingSoonPanel({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-10 text-center">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-[color:var(--almanac-ink-soft)]">
        {kicker}
      </p>
      <h2 className="mt-3 font-serif text-3xl leading-tight text-[color:var(--almanac-ink)] md:text-4xl">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
        We&apos;re still designing this section. It will arrive in a future update.
      </p>
    </div>
  );
}

function CollegeListTab({ model }: { model: DashboardModel }) {
  const active = model.collegeList.filter(
    (t) => !closedStatuses.includes(t.status as (typeof closedStatuses)[number]),
  );
  const closed = model.collegeList.filter((t) =>
    closedStatuses.includes(t.status as (typeof closedStatuses)[number]),
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid gap-5">
        <Section
          kicker="Targets"
          title="What you're working toward"
          description="Schools, jobs, programs, skills, qualities — anything you want in your sights. Mark each one as a dream, reach, match, or necessity."
        >
          {active.length ? (
            <div className="grid gap-3">
              {active.map((target) => (
                <CollegeCard college={target} key={target.id} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-5">
              <h3 className="font-serif text-2xl leading-tight">Start with one target you're curious about.</h3>
              <p className="mt-2 text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
                A school, a job, a fellowship, a skill, a quality you want to grow — anything you're working toward.
              </p>
            </div>
          )}
        </Section>

        {closed.length ? (
          <Section
            kicker="Closed"
            title="Actualized & set aside"
            description="Targets you've achieved, manifested, or chosen to pause."
          >
            <div className="grid gap-3">
              {closed.map((target) => (
                <CollegeCard college={target} key={target.id} />
              ))}
            </div>
          </Section>
        ) : null}
      </div>

      <aside className="grid gap-4 self-start">
        <CollegeListForm />
        <SmallPanel label="Conversation updates">
          When a session mentions a target, it can be saved here automatically.
        </SmallPanel>
      </aside>
    </div>
  );
}

function ProgressTab({
  activities,
  awards,
  collegeList,
  goals,
  guidedSessions,
  model,
  notes,
  studentMemories,
  studentProfile,
  weeklyChallenges,
}: {
  activities: Activity[];
  awards: Award[];
  collegeList: CollegeListEntry[];
  goals: Goal[];
  guidedSessions: GuidedSession[];
  model: DashboardModel;
  notes: Note[];
  studentMemories: StudentMemory[];
  studentProfile: StudentAdmissionsProfile | null;
  weeklyChallenges: WeeklyChallenge[];
}) {
  const wordsWritten = useMemo(() => {
    const fromNotes = notes.reduce((sum, n) => sum + countWords(n.body), 0);
    const fromSessions = guidedSessions.reduce(
      (sum, s) => sum + countWords(s.summary) + countWords(s.transcript),
      0,
    );
    return fromNotes + fromSessions;
  }, [notes, guidedSessions]);

  const readyActivities = activities.filter(
    (a) => a.role?.trim() && a.impact?.trim(),
  ).length;

  const completedChallenges = weeklyChallenges.filter(
    (c) => c.status === "completed",
  ).length;

  const voiceSessions = guidedSessions.filter(
    (s) => s.interaction_mode === "voice" || s.interaction_mode === "mixed",
  ).length;

  const hasPriority = Boolean(studentProfile?.current_priority);
  const priorityLabel = currentPriorityLabel(studentProfile?.current_priority);
  const themeMemory = studentMemories.find(
    (m) => m.memory_type === "theme" || m.memory_type === "essay_seed",
  );
  const directionIdentified = hasPriority || Boolean(themeMemory);
  const directionLabel = directionIdentified
    ? priorityLabel || themeMemory?.label || "Emerging"
    : "Not yet";
  const directionDetail = directionIdentified
    ? hasPriority
      ? "current priority set"
      : "theme surfacing in sessions"
    : "explore in sessions to surface one";

  // Resume / application list readiness — derived from activity quality.
  const totalActivities = activities.length;
  const resumeStatus =
    totalActivities === 0
      ? "Not yet"
      : readyActivities === totalActivities
        ? "Ready"
        : "Drafting";
  const resumeDetail =
    totalActivities === 0
      ? "add activities to seed it"
      : `${readyActivities} of ${totalActivities} application-ready`;

  const achievements = useMemo(
    () => computeAchievements({ activities, awards, notes, goals, collegeList }),
    [activities, awards, notes, goals, collegeList],
  );
  const earnedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="grid gap-5">
      <Section
        kicker="Engagement"
        title="How active you've been"
        description="A snapshot of what you've put into the app — every entry, reflection, and challenge adds up."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <EngagementCard
            detail={`${readyActivities} ready to use`}
            label="Activities"
            value={`${activities.length}`}
          />
          <EngagementCard
            detail="collected"
            label="Awards"
            value={`${awards.length}`}
          />
          <EngagementCard
            detail={notes.length === 1 ? "note captured" : "notes captured"}
            label="Reflections"
            value={`${notes.length}`}
          />
          <EngagementCard
            detail={voiceSessions === 1 ? "session" : "sessions"}
            label="Voice sessions"
            value={`${voiceSessions}`}
          />
          <EngagementCard
            detail={goals.length === 1 ? "goal set" : "goals set"}
            label="Goals"
            value={`${goals.length}`}
          />
          <EngagementCard
            detail="completed"
            label="Weekly challenges"
            value={`${completedChallenges}`}
          />
          <EngagementCard
            detail="across notes & sessions"
            label="Words written"
            value={wordsWritten.toLocaleString("en")}
          />
          <EngagementCard
            detail="schools, jobs, programs in sight"
            label="Long-term targets"
            value={`${collegeList.length}`}
          />
          <EngagementCard
            detail={resumeDetail}
            label="Application list"
            value={resumeStatus}
          />
          <EngagementCard
            detail={directionDetail}
            label="Direction"
            value={directionLabel}
          />
        </div>
      </Section>

      <Section
        kicker="Achievements"
        title="Badges you've earned"
        description={`${earnedCount} of ${achievements.length} unlocked — keep logging to collect them all.`}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {achievements.map((a) => (
            <AchievementBadge
              description={a.description}
              emoji={a.emoji}
              key={a.title}
              title={a.title}
              unlocked={a.unlocked}
            />
          ))}
        </div>
      </Section>

      <Section kicker="Weekly Challenge" title="Last 8 weeks">
        <WeeklyChallengeTracker challenges={weeklyChallenges} />
      </Section>

      <Section
        kicker="Profile development"
        title="Where your story is coming together"
        description="How the material you've added is shaping up across the dimensions that matter."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {model.readinessAreas.map((area) => (
            <ReadinessCard area={area} key={area.label} />
          ))}
        </div>
      </Section>

      <Section kicker="Profile diagnosis" title="Counselor read">
        <div className="grid gap-4 lg:grid-cols-3">
          <DiagnosisList label="Strengths" items={model.profileDiagnosis.strengths} />
          <DiagnosisList label="Needs work" items={model.profileDiagnosis.needsWork} />
          <div className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-ink)] p-5 text-[color:var(--almanac-paper)]">
            <p className="text-xs uppercase tracking-[0.16em] text-white/60">Next action</p>
            <p className="mt-3 text-sm leading-6 text-white/82">
              {model.profileDiagnosis.nextAction}
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}

function EngagementCard({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-4">
      <p className="text-[0.65rem] uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl leading-tight text-[color:var(--almanac-ink)]">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-[color:var(--almanac-ink-soft)]">
        {detail}
      </p>
    </article>
  );
}

function countWords(text: string | null | undefined): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ── Achievements ─────────────────────────────────────────────────────────────

type Achievement = {
  emoji: string;
  title: string;
  description: string;
  unlocked: boolean;
};

const LEADERSHIP_WORDS = [
  "president", "captain", "founder", "co-founder", "leader", "lead ", "officer",
  "chair", "director", "manager", "coordinator", "council", "head ",
  "student government", "editor-in-chief", "section leader",
];

const VOLUNTEER_WORDS = [
  "volunteer", "service", "community", "nonprofit", "non-profit", "charity",
  "outreach", "fundrais", "donate", "shelter", "food bank", "soup kitchen",
  "habitat", "red cross", "civic", "tutor",
];

function activityText(a: Activity): string {
  return [a.name, a.role, a.position, a.category, (a.tags ?? []).join(" "), a.impact, a.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function localDay(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Longest run of consecutive calendar days present in the given day-strings. */
function longestDailyStreak(days: string[]): number {
  const unique = Array.from(new Set(days)).sort();
  if (!unique.length) return 0;
  let longest = 1;
  let current = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(`${unique[i - 1]}T00:00:00`);
    const cur = new Date(`${unique[i]}T00:00:00`);
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
    if (diff === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else if (diff > 1) {
      current = 1;
    }
  }
  return longest;
}

function computeAchievements({
  activities,
  awards,
  collegeList,
  goals,
  notes,
}: {
  activities: Activity[];
  awards: Award[];
  collegeList: CollegeListEntry[];
  goals: Goal[];
  notes: Note[];
}): Achievement[] {
  const totalEntries =
    activities.length + awards.length + notes.length + goals.length;

  const entryDays = [
    ...activities.map((a) => a.created_at),
    ...awards.map((a) => a.created_at),
    ...notes.map((n) => n.created_at),
    ...goals.map((g) => g.created_at),
  ]
    .filter(Boolean)
    .map(localDay);
  const streak = longestDailyStreak(entryDays);

  const categorySet = new Set<string>();
  for (const a of activities) {
    if (a.category?.trim()) categorySet.add(a.category.trim().toLowerCase());
    for (const t of a.tags ?? []) if (t.trim()) categorySet.add(t.trim().toLowerCase());
  }

  const finishedSomething =
    goals.some((g) => g.status === "completed") ||
    collegeList.some((t) => t.status === "Actualized") ||
    activities.some((a) => a.in_progress === false && Boolean(a.end_date));

  const hasLeadership = activities.some((a) => {
    const t = activityText(a);
    return LEADERSHIP_WORDS.some((w) => t.includes(w));
  });
  const hasVolunteer = activities.some((a) => {
    const t = activityText(a);
    return VOLUNTEER_WORDS.some((w) => t.includes(w));
  });

  return [
    { emoji: "📝", title: "First Entry", description: "Log your first progress update", unlocked: totalEntries >= 1 },
    { emoji: "🔥", title: "3-Day Streak", description: "Log activity 3 days in a row", unlocked: streak >= 3 },
    { emoji: "🔥", title: "7-Day Streak", description: "Log activity 7 days in a row", unlocked: streak >= 7 },
    { emoji: "🏅", title: "30-Day Streak", description: "Log activity 30 days in a row", unlocked: streak >= 30 },
    { emoji: "🌟", title: "Well-Rounded", description: "Activities in 3+ categories", unlocked: categorySet.size >= 3 },
    { emoji: "✅", title: "Closer", description: "Mark your first activity complete", unlocked: finishedSomething },
    { emoji: "🏆", title: "Overachiever", description: "Log 5 or more awards", unlocked: awards.length >= 5 },
    { emoji: "👑", title: "First Leadership Role", description: "Lead an activity or team", unlocked: hasLeadership },
    { emoji: "🤝", title: "First Volunteer Role", description: "Join a service activity", unlocked: hasVolunteer },
    { emoji: "💎", title: "SuperAchiever", description: "Log 10 or more awards", unlocked: awards.length >= 10 },
    { emoji: "⭐", title: "5 Activities", description: "Log 5 or more activities", unlocked: activities.length >= 5 },
    { emoji: "🌠", title: "10 Activities", description: "Log 10 or more activities", unlocked: activities.length >= 10 },
    { emoji: "🚀", title: "20 Activities", description: "Log 20 or more activities", unlocked: activities.length >= 20 },
  ];
}

function AchievementBadge({
  description,
  emoji,
  title,
  unlocked,
}: Achievement) {
  return (
    <article
      className={[
        "flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition",
        unlocked
          ? "border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)]"
          : "border-dashed border-[color:var(--almanac-rule)] opacity-60",
      ].join(" ")}
    >
      <span
        aria-hidden
        className="text-3xl leading-none"
        style={unlocked ? undefined : { filter: "grayscale(1)" }}
      >
        {emoji}
      </span>
      <div className="min-h-0">
        <p className="font-serif text-[0.95rem] leading-tight text-[color:var(--almanac-ink)]">
          {title}
        </p>
        <p className="mt-0.5 text-[0.68rem] leading-4 text-[color:var(--almanac-ink-soft)]">
          {description}
        </p>
      </div>
      <span
        className={[
          "rounded-full px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.12em]",
          unlocked
            ? "bg-[color:var(--almanac-olive)]/15 text-[color:var(--almanac-olive)]"
            : "bg-black/5 text-[color:var(--almanac-ink-soft)]",
        ].join(" ")}
      >
        {unlocked ? "Earned" : "Locked"}
      </span>
    </article>
  );
}

// ── Weekly Challenge tracker ────────────────────────────────────────────────

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday = 0, Sunday = 6
  d.setDate(d.getDate() - diff);
  return d;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type WeekCell = { weekStart: string; state: "completed" | "set" | "none" };

function buildWeekTracker(challenges: WeeklyChallenge[]): WeekCell[] {
  const thisMonday = startOfWeek(new Date());
  const cells: WeekCell[] = [];
  for (let i = 7; i >= 0; i--) {
    const m = new Date(thisMonday);
    m.setDate(thisMonday.getDate() - i * 7);
    const weekStart = toISODate(m);
    const inWeek = challenges.filter((c) => c.week_start_date === weekStart);
    let state: WeekCell["state"] = "none";
    if (inWeek.some((c) => c.status === "completed")) state = "completed";
    else if (inWeek.length > 0) state = "set";
    cells.push({ weekStart, state });
  }
  return cells;
}

function weekStateColor(state: WeekCell["state"]): string {
  if (state === "completed") return "var(--almanac-olive)";
  if (state === "set") return "var(--almanac-butter)";
  return "rgba(0,0,0,0.08)";
}

function weekStateLabel(state: WeekCell["state"]): string {
  if (state === "completed") return "Completed";
  if (state === "set") return "Challenge set";
  return "No activity";
}

function WeeklyChallengeTracker({ challenges }: { challenges: WeeklyChallenge[] }) {
  const weeks = useMemo(() => buildWeekTracker(challenges), [challenges]);
  const completed = weeks.filter((w) => w.state === "completed").length;
  const message =
    completed === 0
      ? "Start a streak!"
      : completed >= 8
        ? "Perfect run — every week completed!"
        : "Keep it going!";

  return (
    <div>
      <div className="flex items-end gap-2">
        {weeks.map((w) => {
          const [, mm, dd] = w.weekStart.split("-");
          return (
            <div className="flex flex-1 flex-col items-center gap-1.5" key={w.weekStart}>
              <div
                className="aspect-square w-full max-w-[3.5rem] rounded-lg border border-black/5"
                style={{ backgroundColor: weekStateColor(w.state) }}
                title={`Week of ${w.weekStart}: ${weekStateLabel(w.state)}`}
              />
              <span className="text-[0.6rem] text-[color:var(--almanac-ink-soft)]">
                {Number(mm)}/{Number(dd)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.72rem] text-[color:var(--almanac-ink-soft)]">
        <LegendSwatch color={weekStateColor("completed")} label="Completed" />
        <LegendSwatch color={weekStateColor("set")} label="Challenge set" />
        <LegendSwatch color={weekStateColor("none")} label="No activity" />
      </div>

      <p className="mt-3 text-sm text-[color:var(--almanac-ink)]">
        <span className="font-semibold">{completed} of 8 weeks</span> completed — {message}
      </p>
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="size-3 rounded-[4px] border border-black/5"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function PageHeader({
  title,
}: {
  title: ReactNode;
}) {
  return (
    <header className="border-b border-[color:var(--almanac-rule)] px-5 py-6 md:px-9 md:py-8">
      <div className="max-w-5xl">
        <h1 className="font-serif text-4xl leading-[1.02] text-[color:var(--almanac-ink)] md:text-5xl">
          {title}
        </h1>
      </div>
    </header>
  );
}

function Section({
  children,
  description,
  kicker,
  title,
}: {
  children: ReactNode;
  description?: string;
  kicker: string;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-5 md:p-6">
      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[color:var(--almanac-ink-soft)]">
        {kicker}
      </p>
      <h2 className="mt-2 font-serif text-3xl leading-tight text-[color:var(--almanac-ink)]">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
          {description}
        </p>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SmallPanel({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-5">
      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[color:var(--almanac-ink-soft)]">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--almanac-ink)]">{children}</p>
    </section>
  );
}

const TAG_COLORS = ["#4e5b7a", "#d27b57", "#efc97a", "#7a9e7a", "#9b7ab8", "#5b8fa8", "#c4697a", "#8a7a5b"];
const DEFAULT_TAGS = ["STEM", "Humanities", "Leadership", "Social Service"];
const STORAGE_KEY = "cultvr-profile-depth-tags";

/** Keyword map used to auto-classify activities/awards into tags. */
const TAG_KEYWORDS: Record<string, string[]> = {
  stem: ["stem", "science", "math", "engineering", "technology", "robotics", "coding", "computer", "physics", "chemistry", "biology", "data", "research", "lab"],
  humanities: ["humanities", "history", "english", "writing", "literature", "philosophy", "language", "social studies", "debate", "speech", "journalism", "reading"],
  leadership: ["leadership", "president", "captain", "founder", "lead", "officer", "chair", "director", "manager", "mentor", "council", "student government"],
  "social service": ["service", "volunteer", "community", "nonprofit", "charity", "outreach", "tutor", "mentor", "fundrais", "advocacy", "civic"],
  arts: ["art", "music", "theater", "theatre", "dance", "film", "photography", "design", "creative", "paint", "draw", "sculpt", "sing", "choir", "orchestra", "band"],
  creativity: ["creative", "innovation", "invent", "design", "maker", "craft", "build", "create", "entrepreneurship", "startup"],
};

function loadTags(): string[] {
  if (typeof window === "undefined") return DEFAULT_TAGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch { /* use defaults */ }
  return DEFAULT_TAGS;
}

function saveTags(tags: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
}

function classifyItem(text: string, tags: string[]): string[] {
  const lower = text.toLowerCase();
  return tags.filter((tag) => {
    const keywords = TAG_KEYWORDS[tag.toLowerCase()];
    if (keywords) return keywords.some((kw) => lower.includes(kw));
    return lower.includes(tag.toLowerCase());
  });
}

function buildTagDepth(activities: Activity[], awards: Award[], tags: string[]): ProfileDepth {
  const counts = new Map<string, number>();
  tags.forEach((tag) => counts.set(tag, 0));

  for (const activity of activities) {
    const text = `${activity.name} ${activity.role ?? ""} ${activity.impact ?? ""}`;
    const matched = classifyItem(text, tags);
    for (const tag of matched) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  for (const award of awards) {
    const text = `${award.name} ${award.scope ?? ""}`;
    const matched = classifyItem(text, tags);
    for (const tag of matched) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  const goal = 5;
  const breakdown: ProfileDepthBreakdown[] = tags.map((tag, i) => ({
    label: tag,
    current: Math.min(counts.get(tag) ?? 0, goal),
    goal,
    note: `activities & awards`,
    color: TAG_COLORS[i % TAG_COLORS.length],
  }));

  const total = breakdown.reduce((sum, b) => sum + b.current / b.goal, 0);
  const value = breakdown.length ? Math.round((total / breakdown.length) * 100) : 0;

  return { value, breakdown };
}

function ProfileDepthOverview({ activities, awards }: { activities: Activity[]; awards: Award[] }) {
  const [tags, setTags] = useState<string[]>(DEFAULT_TAGS);
  const [editing, setEditing] = useState(false);
  const [newTag, setNewTag] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTags(loadTags());
  }, []);

  useEffect(() => {
    if (!editing) return;
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setEditing(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editing]);

  const updateTags = useCallback((next: string[]) => {
    setTags(next);
    saveTags(next);
  }, []);

  const addTag = useCallback(() => {
    const trimmed = newTag.trim();
    if (!trimmed || tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) return;
    updateTags([...tags, trimmed]);
    setNewTag("");
  }, [newTag, tags, updateTags]);

  const removeTag = useCallback((tag: string) => {
    updateTags(tags.filter((t) => t !== tag));
  }, [tags, updateTags]);

  const depth = useMemo(() => buildTagDepth(activities, awards, tags), [activities, awards, tags]);

  return (
    <section className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-5 md:p-6">
      <div className="relative flex items-center justify-between">
        <p className="text-[0.65rem] uppercase tracking-[0.18em] text-[color:var(--almanac-ink-soft)]">
          Profile depth
        </p>
        <button
          className="rounded-full p-1.5 text-[color:var(--almanac-ink-soft)] transition hover:bg-black/5 hover:text-[color:var(--almanac-ink)]"
          onClick={() => setEditing(!editing)}
          title="Edit categories"
          type="button"
        >
          <Settings size={14} />
        </button>

        {editing && (
          <div
            ref={popoverRef}
            className="absolute right-0 top-8 z-20 w-72 rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-4 shadow-lg"
          >
            <p className="text-xs font-medium text-[color:var(--almanac-ink)]">
              Customize categories
            </p>
            <p className="mt-1 text-[0.68rem] leading-4 text-[color:var(--almanac-ink-soft)]">
              Add or remove tags to track your profile depth.
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((tag, i) => (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-white"
                  key={tag}
                  style={{ backgroundColor: TAG_COLORS[i % TAG_COLORS.length] }}
                >
                  {tag}
                  <button
                    className="ml-0.5 rounded-full p-0.5 transition hover:bg-white/25"
                    onClick={() => removeTag(tag)}
                    type="button"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-lg border border-[color:var(--almanac-rule)] bg-white/70 px-2.5 py-1.5 text-xs text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[#3F4A66]"
                maxLength={30}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="New category…"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
              />
              <button
                className="inline-flex items-center gap-1 rounded-lg bg-[color:var(--almanac-ink)] px-2.5 py-1.5 text-xs font-medium text-[color:var(--almanac-paper)] transition hover:opacity-90"
                onClick={addTag}
                type="button"
              >
                <Plus size={12} />
                Add
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 grid items-center gap-7 md:grid-cols-[15rem_1fr]">
        <div className="relative mx-auto size-52">
          <ProgressRings rings={depth.breakdown} />
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-serif text-4xl leading-none text-[color:var(--almanac-ink)]">
              {depth.value}%
            </p>
          </div>
        </div>
        <div>
          <div className="grid gap-3">
            {depth.breakdown.map((item) => {
              const progress = Math.min((item.current / item.goal) * 100, 100);

              return (
                <div className="flex items-center gap-4" key={item.label}>
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-serif text-xl italic leading-tight text-[color:var(--almanac-ink)]">
                        {item.label}
                      </p>
                      <p className="text-xs text-[color:var(--almanac-ink-soft)]">
                        {item.current} {item.current === 1 ? "activity" : "activities"}
                      </p>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/10">
                      <div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: item.color,
                          width: `${progress}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProgressRings({ rings }: { rings: ProfileDepthBreakdown[] }) {
  const size = 200;
  const ringWidth = 14;
  const radii = [88, 66, 44];

  return (
    <svg className="h-full w-full" viewBox={`0 0 ${size} ${size}`}>
      {rings.map((ring, index) => {
        const radius = radii[index] ?? 44;
        const circumference = 2 * Math.PI * radius;
        const value = Math.min(ring.current / ring.goal, 1);

        return (
          <g key={ring.label} transform={`translate(${size / 2} ${size / 2}) rotate(-90)`}>
            <circle
              fill="none"
              r={radius}
              stroke={ring.color}
              strokeOpacity="0.18"
              strokeWidth={ringWidth}
            />
            <circle
              fill="none"
              r={radius}
              stroke={ring.color}
              strokeDasharray={`${circumference * value} ${circumference}`}
              strokeLinecap="round"
              strokeWidth={ringWidth}
            />
          </g>
        );
      })}
    </svg>
  );
}

function KnowledgeGraphPanel({ graph }: { graph: KnowledgeGraph }) {
  const positionedNodes = layoutGraphNodes(graph.nodes);
  const nodeMap = new Map(positionedNodes.map((node) => [node.id, node]));

  return (
    <section className="overflow-hidden rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-4 md:p-5">
      <div className="flex flex-col gap-1">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[color:var(--almanac-ink-soft)]">
          Knowledge Graph
        </p>
        <p className="max-w-sm text-xs leading-5 text-[color:var(--almanac-ink-soft)]">
          Patterns emerging from your sessions and activities.
        </p>
      </div>

      <div className="mt-4 h-56 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#2e3138] via-[#23262c] to-[#2a2d34] p-2 shadow-inner">
          <svg className="h-full w-full" viewBox="0 0 760 230" role="img" aria-label="Session keyword knowledge graph">
            <defs>
              <filter id="knowledge-glow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Soft blur for aurora ribbons. */}
              <filter id="aurora-blur" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
              {/* Animated dashed-line gradient so links subtly "flow" between nodes. */}
              <linearGradient id="link-flow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(236,242,255,0.15)" />
                <stop offset="50%" stopColor="rgba(236,242,255,0.7)" />
                <stop offset="100%" stopColor="rgba(236,242,255,0.15)" />
                <animate
                  attributeName="x1"
                  dur="6s"
                  from="-100%"
                  repeatCount="indefinite"
                  to="100%"
                />
                <animate
                  attributeName="x2"
                  dur="6s"
                  from="0%"
                  repeatCount="indefinite"
                  to="200%"
                />
              </linearGradient>
              {/* Drifting purple nebula cloud — brighter now. */}
              <radialGradient id="nebula-purple" cx="30%" cy="40%" r="50%">
                <stop offset="0%" stopColor="rgba(210,140,255,0.55)" />
                <stop offset="60%" stopColor="rgba(140,80,220,0.22)" />
                <stop offset="100%" stopColor="rgba(110,60,200,0)" />
                <animate attributeName="cx" dur="24s" values="30%;65%;30%" repeatCount="indefinite" />
                <animate attributeName="cy" dur="19s" values="40%;55%;40%" repeatCount="indefinite" />
              </radialGradient>
              {/* Drifting cyan/magenta nebula on a different timing. */}
              <radialGradient id="nebula-cyan" cx="75%" cy="65%" r="45%">
                <stop offset="0%" stopColor="rgba(140,200,255,0.5)" />
                <stop offset="55%" stopColor="rgba(255,120,200,0.18)" />
                <stop offset="100%" stopColor="rgba(80,140,255,0)" />
                <animate attributeName="cx" dur="28s" values="75%;35%;75%" repeatCount="indefinite" />
                <animate attributeName="cy" dur="22s" values="65%;30%;65%" repeatCount="indefinite" />
              </radialGradient>
              {/* Diagonal Milky Way dust band stretching from upper-left to lower-right. */}
              <linearGradient id="milky-way" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                <stop offset="40%" stopColor="rgba(220,200,255,0.18)" />
                <stop offset="50%" stopColor="rgba(255,235,210,0.28)" />
                <stop offset="60%" stopColor="rgba(200,180,255,0.18)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
              {/* Aurora ribbon — emerald → teal → magenta vertical fade. */}
              <linearGradient id="aurora-green" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(120,255,200,0)" />
                <stop offset="40%" stopColor="rgba(110,240,180,0.55)" />
                <stop offset="70%" stopColor="rgba(140,200,255,0.45)" />
                <stop offset="100%" stopColor="rgba(180,140,255,0)" />
              </linearGradient>
              {/* Aurora ribbon 2 — pink/violet for warmth. */}
              <linearGradient id="aurora-pink" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,180,230,0)" />
                <stop offset="50%" stopColor="rgba(255,140,210,0.4)" />
                <stop offset="100%" stopColor="rgba(180,100,255,0)" />
              </linearGradient>
            </defs>

            {/* Nebula backdrop — two drifting clouds layered behind everything. */}
            <rect width="760" height="230" fill="url(#nebula-purple)" />
            <rect width="760" height="230" fill="url(#nebula-cyan)" />

            {/* Milky Way diagonal dust band — a rotated soft strip across the field. */}
            <g transform="translate(380 115) rotate(-15) translate(-380 -115)">
              <rect
                x="-100"
                y="80"
                width="960"
                height="70"
                fill="url(#milky-way)"
                opacity="0.85"
              />
            </g>

            {/* Aurora ribbons — wavy curtains that shimmer at the top. */}
            <g filter="url(#aurora-blur)">
              <path
                d="M -20,30 Q 140,5 320,40 T 700,30 Q 760,32 780,35 L 780,90 Q 600,115 380,80 T -20,95 Z"
                fill="url(#aurora-green)"
                opacity="0.7"
              >
                <animate
                  attributeName="opacity"
                  dur="9s"
                  repeatCount="indefinite"
                  values="0.45;0.85;0.45"
                />
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  dur="14s"
                  repeatCount="indefinite"
                  values="0 0; 20 -4; 0 0; -20 4; 0 0"
                />
              </path>
              <path
                d="M -20,60 Q 200,90 400,55 T 780,70 L 780,120 Q 580,150 400,115 T -20,130 Z"
                fill="url(#aurora-pink)"
                opacity="0.55"
              >
                <animate
                  attributeName="opacity"
                  dur="11s"
                  begin="2s"
                  repeatCount="indefinite"
                  values="0.3;0.7;0.3"
                />
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  dur="17s"
                  repeatCount="indefinite"
                  values="0 0; -25 6; 0 0; 25 -6; 0 0"
                />
              </path>
            </g>

            {/* Background starfield. */}
            {GALAXY_STARS.map((s, i) => (
              <circle
                cx={s.x}
                cy={s.y}
                fill="white"
                key={`star-${i}`}
                opacity={s.bright}
                r={s.r}
              >
                <animate
                  attributeName="opacity"
                  begin={`${s.delay}s`}
                  dur={`${s.dur}s`}
                  repeatCount="indefinite"
                  values={`${s.bright * 0.3};${s.bright};${s.bright * 0.3}`}
                />
              </circle>
            ))}
            {graph.links.map((link, index) => {
              const source = nodeMap.get(link.source);
              const target = nodeMap.get(link.target);
              if (!source || !target) return null;
              const midpointX = (source.x + target.x) / 2;
              const midpointY = (source.y + target.y) / 2 - 24;
              return (
                <path
                  d={`M ${source.x} ${source.y} Q ${midpointX} ${midpointY} ${target.x} ${target.y}`}
                  key={`${link.source}-${link.target}-${index}`}
                  fill="none"
                  stroke="url(#link-flow)"
                  strokeLinecap="round"
                  strokeWidth={Math.max(0.7, link.strength / 42)}
                >
                  <animate
                    attributeName="opacity"
                    dur={`${4 + (index % 3)}s`}
                    values="0.4;0.85;0.4"
                    repeatCount="indefinite"
                  />
                </path>
              );
            })}
            {positionedNodes.map((node, nodeIndex) => {
              const isHub = node.kind === "theme";
              // Bigger bubbles overall, with a stronger correlation to strength
              // so the more important nodes visibly dominate.
              const radius = isHub
                ? 9 + node.strength / 12
                : 6 + node.strength / 16;
              // Font size scales with importance too — 10pt baseline, +up-to-4pt
              // for high-strength nodes; hubs get an extra bump.
              const fontSize = Math.round(
                10 + node.strength / 22 + (isHub ? 1.5 : 0),
              );
              // Stagger pulse timings so the graph feels alive, not synchronized.
              const pulseDur = `${3 + ((nodeIndex * 7) % 5)}s`;
              const pulseDelay = `${(nodeIndex * 0.4) % 2.5}s`;
              return (
                <g key={node.id}>
                  {/* Soft halo that pulses outward — only on hub/theme nodes. */}
                  {isHub && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      fill={nodeFill(node.kind)}
                      opacity="0.15"
                      r={radius}
                    >
                      <animate
                        attributeName="r"
                        dur={pulseDur}
                        begin={pulseDelay}
                        values={`${radius};${radius * 2.4};${radius}`}
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        dur={pulseDur}
                        begin={pulseDelay}
                        values="0.32;0;0.32"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    fill={nodeFill(node.kind)}
                    r={radius}
                    filter={isHub ? "url(#knowledge-glow)" : undefined}
                    stroke="rgba(255,255,255,0.8)"
                    strokeWidth="0.8"
                  >
                    {/* Subtle "breathing" radius on every node. */}
                    <animate
                      attributeName="r"
                      dur={pulseDur}
                      begin={pulseDelay}
                      values={`${radius};${radius * 1.12};${radius}`}
                      repeatCount="indefinite"
                    />
                  </circle>
                  {satelliteOffsets(node.id).map((offset, index) => (
                    <g key={`${node.id}-satellite-${index}`}>
                      <path
                        d={`M ${node.x} ${node.y} Q ${node.x + offset.cx} ${node.y + offset.cy} ${node.x + offset.x} ${node.y + offset.y}`}
                        fill="none"
                        stroke="rgba(236,242,255,0.34)"
                        strokeLinecap="round"
                        strokeWidth="0.55"
                      />
                      <circle
                        cx={node.x + offset.x}
                        cy={node.y + offset.y}
                        fill={index % 2 === 0 ? "#6df7a6" : "#dbe6ff"}
                        r="1.8"
                      >
                        {/* Satellites twinkle individually. */}
                        <animate
                          attributeName="opacity"
                          dur={`${2.5 + ((nodeIndex + index) % 4)}s`}
                          begin={`${(index * 0.3) % 1.5}s`}
                          values="0.5;1;0.5"
                          repeatCount="indefinite"
                        />
                      </circle>
                    </g>
                  ))}
                  {/* Label rendered with a dark stroke "halo" behind a white
                      fill so it stays legible over the nebula background. */}
                  <text
                    fill="rgb(255,255,255)"
                    fontSize={fontSize}
                    fontWeight={isHub ? 700 : 600}
                    paintOrder="stroke"
                    stroke="rgba(28,30,35,0.92)"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    textAnchor={node.x > 610 ? "end" : "start"}
                    x={node.x > 610 ? node.x - radius - 5 : node.x + radius + 5}
                    y={node.y + fontSize / 3}
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
    </section>
  );
}

function SignalCard({ signal }: { signal: StorySignal }) {
  return (
    <article className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-serif text-2xl leading-tight">{signal.label}</h3>
        <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--almanac-ink-soft)]">
          {signal.strength}%
        </p>
      </div>
      <p className="mt-2 text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
        {signal.explanation}
      </p>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/10">
        <div
          className="h-full rounded-full bg-[color:var(--almanac-butter)]"
          style={{ width: `${signal.strength}%` }}
        />
      </div>
    </article>
  );
}

function ReflectionRow({ reflection }: { reflection: ReflectionCard }) {
  return (
    <article className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-4">
      <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
        {reflection.sourceLabel} - {formatDate(reflection.date)}
      </p>
      <h3 className="mt-2 font-serif text-2xl leading-tight">{reflection.title}</h3>
      <p className="mt-2 text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
        {reflection.summary}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {reflection.themes.map((theme) => (
          <Pill key={theme}>{theme}</Pill>
        ))}
      </div>
    </article>
  );
}

function WeeklyActionRow({
  action,
  onStart,
}: {
  action: WeeklyAction;
  onStart: () => void;
}) {
  return (
    <article className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="font-serif text-2xl leading-tight">{action.title}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill>{action.status}</Pill>
            <Pill>{action.timeEstimate}</Pill>
          </div>
        </div>
        <button
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--almanac-rule)] px-4 text-sm font-medium transition hover:bg-white/50"
          onClick={onStart}
          type="button"
        >
          Start reflection
        </button>
      </div>
      <p className="mt-3 text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
        {action.whyItMatters}
      </p>
      <p className="mt-3 rounded-xl bg-white/45 px-3 py-2 text-sm leading-6 text-[color:var(--almanac-ink)]">
        {action.suggestedPrompt}
      </p>
    </article>
  );
}

function CollegeCard({ college }: { college: CollegeListItem }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const statusColor = statusColors[college.status] ?? "#9a9a9a";
  const closed = closedStatuses.includes(
    college.status as (typeof closedStatuses)[number],
  );

  // Submit an update with the current edit-form values plus a (possibly
  // overridden) status. Used by both Save and the quick-action buttons.
  function submitUpdate(form: HTMLFormElement, overrideStatus?: string) {
    const formData = new FormData(form);
    if (overrideStatus) formData.set("status", overrideStatus);
    setError(null);
    startTransition(async () => {
      try {
        await updateCollegeListEntry(formData);
        setEditing(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Save failed.";
        console.error("Update target failed:", err);
        setError(message);
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${college.name}"? This can't be undone.`)) return;
    const fd = new FormData();
    fd.set("id", college.id);
    setError(null);
    startTransition(async () => {
      try {
        await deleteCollegeListEntry(fd);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Delete failed.";
        console.error("Delete target failed:", err);
        setError(message);
      }
    });
  }

  return (
    <article
      className={[
        "rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-4 transition",
        closed ? "opacity-70" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <h3
          className={[
            "font-serif text-2xl leading-tight",
            closed ? "text-[color:var(--almanac-ink-soft)]" : "",
          ].join(" ")}
        >
          {college.name}
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em]"
            style={{ backgroundColor: `${statusColor}26`, color: statusColor }}
          >
            {college.status}
          </span>
          <button
            className="text-[0.7rem] text-[color:var(--almanac-ink-soft)] underline transition hover:text-[color:var(--almanac-ink)]"
            onClick={() => setEditing((v) => !v)}
            type="button"
          >
            {editing ? "Close" : "Edit"}
          </button>
        </div>
      </div>

      {college.notes && !editing ? (
        <p className="mt-2 text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
          {college.notes}
        </p>
      ) : null}

      {editing ? (
        <form
          className="mt-3 grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submitUpdate(e.currentTarget);
          }}
        >
          <input name="id" type="hidden" value={college.id} />
          {/* DB still has these columns — pass through unchanged. */}
          <input name="location" type="hidden" value={college.location ?? ""} />
          <input name="fit_reason" type="hidden" value={college.fitReason ?? ""} />
          <input name="priority" type="hidden" value={college.priority} />
          {/* Status carries the current value; quick-action buttons override on click. */}
          <input name="status" type="hidden" value={college.status} />

          <input
            className="h-9 rounded-lg border border-[color:var(--almanac-rule)] bg-white/65 px-3 text-sm text-[color:var(--almanac-ink)] outline-none focus:border-[color:var(--almanac-olive)]"
            defaultValue={college.name}
            name="name"
            placeholder="Target"
            required
          />
          <textarea
            className="min-h-[3.5rem] rounded-lg border border-[color:var(--almanac-rule)] bg-white/65 px-3 py-1.5 text-sm leading-5 text-[color:var(--almanac-ink)] outline-none focus:border-[color:var(--almanac-olive)]"
            defaultValue={college.notes ?? ""}
            name="notes"
            placeholder="Notes"
            rows={2}
          />

          {/* Quick actions — each submits the form with that status applied. */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <button
              className="h-8 rounded-md bg-[color:var(--almanac-ink)] px-2.5 text-[0.72rem] font-medium text-[color:var(--almanac-paper)] disabled:opacity-50"
              disabled={isPending}
              type="submit"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
            <span className="ml-1 mr-1 h-4 w-px bg-[color:var(--almanac-rule)]" />
            <QuickStatusButton
              color={statusColors["Actualized"]}
              disabled={isPending}
              label="Actualized"
              onClick={(e) => {
                const form = (e.currentTarget as HTMLButtonElement).closest("form");
                if (form) submitUpdate(form, "Actualized");
              }}
            />
            <QuickStatusButton
              color={statusColors["Getting Close"]}
              disabled={isPending}
              label="Getting Close"
              onClick={(e) => {
                const form = (e.currentTarget as HTMLButtonElement).closest("form");
                if (form) submitUpdate(form, "Getting Close");
              }}
            />
            <QuickStatusButton
              color={statusColors["Set Aside For Now"]}
              disabled={isPending}
              label="Set Aside For Now"
              onClick={(e) => {
                const form = (e.currentTarget as HTMLButtonElement).closest("form");
                if (form) submitUpdate(form, "Set Aside For Now");
              }}
            />
            <button
              className="h-8 rounded-md border border-[color:var(--almanac-clay)]/40 px-2.5 text-[0.72rem] font-medium text-[color:var(--almanac-clay)] transition hover:bg-[color:var(--almanac-clay)]/10 disabled:opacity-50"
              disabled={isPending}
              onClick={handleDelete}
              type="button"
            >
              Delete
            </button>
          </div>

          {error ? (
            <p className="rounded-md bg-[color:var(--almanac-clay)]/15 px-2.5 py-1.5 text-[0.7rem] leading-5 text-[color:var(--almanac-clay)]">
              {error}
            </p>
          ) : null}
        </form>
      ) : null}
    </article>
  );
}

function QuickStatusButton({
  color,
  disabled,
  label,
  onClick,
}: {
  color: string;
  disabled: boolean;
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      className="h-8 rounded-md border px-2.5 text-[0.72rem] font-medium transition disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      style={{
        borderColor: `${color}40`,
        color,
        backgroundColor: `${color}10`,
      }}
      type="button"
    >
      {label}
    </button>
  );
}

function CollegeListForm() {
  const [actionPlanDest, setActionPlanDest] = useState<"none" | "1year" | "longterm">("none");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = ((formData.get("name") as string) || "").trim();

    // Capture the destination synchronously — startTransition runs the server
    // action after this event handler returns, by which time the select state
    // may already have been reset.
    const dest = actionPlanDest;

    setError(null);

    startTransition(async () => {
      try {
        await createCollegeListEntry(formData);
        if (dest !== "none" && name) {
          addTargetToActionPlan(dest, name);
        }
        form.reset();
        setActionPlanDest("none");
        toast.success(name ? `Added "${name}" to your targets.` : "Target added.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to add target.";
        console.error("Add target failed:", err);
        setError(message);
        toast.error(message);
      }
    });
  }

  return (
    <form
      className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-5"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]">
          <Plus size={15} />
        </span>
        <h3 className="font-serif text-2xl leading-tight">Add target</h3>
      </div>
      <div className="mt-4 grid gap-2.5">
        <TextInput
          name="name"
          placeholder="Target — school, role, program, skill, quality…"
          required
        />
        <SelectInput defaultValue="Dream" name="status">
          {activeStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </SelectInput>
        <TextArea name="notes" placeholder="Notes (optional)" />

        {/* Hidden fields — DB still has these columns; we just don't surface them. */}
        <input name="location" type="hidden" value="" />
        <input name="fit_reason" type="hidden" value="" />
        <input name="priority" type="hidden" value="Medium" />

        <div className="mt-1">
          <p className="mb-1.5 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[color:var(--almanac-ink-soft)]">
            Also add to action plan?
          </p>
          <select
            className="h-10 w-full rounded-lg border border-[color:var(--almanac-rule)] bg-white/65 px-3 text-sm text-[color:var(--almanac-ink)] outline-none focus:border-[color:var(--almanac-olive)]"
            onChange={(e) =>
              setActionPlanDest(e.target.value as "none" | "1year" | "longterm")
            }
            value={actionPlanDest}
          >
            <option value="none">No, just here</option>
            <option value="1year">Yes — 1 Year action plan</option>
            <option value="longterm">Yes — Long-term action plan</option>
          </select>
        </div>

        <button
          className="h-10 rounded-lg bg-[color:var(--almanac-ink)] px-4 text-sm font-medium text-[color:var(--almanac-paper)] disabled:opacity-60"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Adding…" : "Add target"}
        </button>

        {error ? (
          <p className="rounded-lg bg-[color:var(--almanac-clay)]/15 px-3 py-2 text-xs leading-5 text-[color:var(--almanac-clay)]">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}

/**
 * Write a manual item into the Action Plan's localStorage so the target shows
 * up immediately in the chosen window. Mirrors the structure used by
 * `ActionPlanView` in `almanac-workspace.tsx` (storage key `cultvr-action-plan-v3`).
 */
function addTargetToActionPlan(windowId: "1year" | "longterm", text: string) {
  if (typeof window === "undefined") return;
  const STORAGE_KEY = "cultvr-action-plan-v3";
  type Item = { id: string; text: string; done: boolean };
  type Store = Record<string, Record<string, Item[]>>;

  let store: Store;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    store = raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    store = {};
  }

  if (!store[windowId]) store[windowId] = { reaches: [], targets: [] };
  if (!Array.isArray(store[windowId].targets)) store[windowId].targets = [];

  store[windowId].targets.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text,
    done: false,
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function ReadinessCard({ area }: { area: ReadinessArea }) {
  return (
    <article className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-4">
      <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
        {area.label}
      </p>
      <h3 className="mt-2 font-serif text-2xl leading-tight">{area.value}</h3>
      <p className="mt-2 text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
        {area.detail}
      </p>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/10">
        <div
          className="h-full rounded-full bg-[color:var(--almanac-butter)]"
          style={{ width: `${area.progress}%` }}
        />
      </div>
    </article>
  );
}

function ReadinessLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] px-4 py-3">
      <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--almanac-ink)]">{value}</p>
    </div>
  );
}

function DiagnosisList({ items, label }: { items: string[]; label: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-5">
      <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
        {label}
      </p>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <p className="text-sm leading-6 text-[color:var(--almanac-ink)]" key={item}>
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function PrimaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      className="inline-flex h-11 items-center gap-2 rounded-full bg-[color:var(--almanac-butter)] px-5 text-sm font-medium text-[color:var(--almanac-ink)] transition hover:bg-[#d5a84d]"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-10 min-w-0 rounded-lg border border-[color:var(--almanac-rule)] bg-white/65 px-3 text-sm text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[color:var(--almanac-olive)]"
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="min-h-20 min-w-0 rounded-lg border border-[color:var(--almanac-rule)] bg-white/65 px-3 py-2 text-sm leading-6 text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[color:var(--almanac-olive)]"
    />
  );
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="h-10 min-w-0 rounded-lg border border-[color:var(--almanac-rule)] bg-white/65 px-3 text-sm text-[color:var(--almanac-ink)] outline-none focus:border-[color:var(--almanac-olive)]"
    />
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex w-fit rounded-full bg-white/60 px-3 py-1 text-xs font-medium text-[color:var(--almanac-ink-soft)]">
      {children}
    </span>
  );
}

function buildDashboardModel({
  awards,
  collegeList,
  goals,
  guidedSessions,
  notes,
  studentMemories,
  tasks,
  activities,
}: Pick<
  DashboardViewProps,
  | "awards"
  | "collegeList"
  | "goals"
  | "guidedSessions"
  | "notes"
  | "studentMemories"
  | "tasks"
  | "activities"
>): DashboardModel {
  const latestSession = guidedSessions[0];
  const guidedNotes = notes.filter((note) => note.category.toLowerCase().includes("guided"));
  const latestReflectionNote = guidedNotes[0] ?? notes[0];
  const summarySource = [
    latestSession?.summary,
    latestSession?.transcript,
    latestReflectionNote?.body,
    activities[0]?.impact,
    activities[0]?.name,
  ]
    .filter(Boolean)
    .join(" ");

  const storySignals = scoreSignals(summarySource);
  const reflections = buildReflections(notes, guidedSessions);
  const essaySeeds = buildEssaySeeds(storySignals, reflections);
  const activityPipeline = buildActivityPipeline(activities);
  const weeklyActions = buildWeeklyActions(tasks, latestSession);
  const colleges = buildCollegeList(collegeList);
  const knowledgeGraph = buildKnowledgeGraph({
    activities,
    collegeList: colleges,
    memories: studentMemories,
    reflections,
    storySignals,
    weeklyActions,
  });
  const profileDepth = buildProfileDepth({ activities, awards, reflections });
  const readinessAreas = buildReadinessAreas({
    activities,
    awards,
    collegeList,
    guidedSessions,
    notes,
    reflections,
    essaySeeds,
  });
  const commonAppReadiness = buildCommonAppReadiness({ activities, essaySeeds, reflections });
  const ucReadiness = buildUCReadiness({ activities, awards, goals, notes });
  const profileDiagnosis = buildDiagnosis({ activities, awards, guidedSessions, storySignals });
  const completedThisWeek = weeklyActions
    .filter((item) => item.status === "Done")
    .map((item) => item.title)
    .slice(0, 3);

  return {
    continuePanel: {
      heroSummary:
        summarizeLead(latestSession?.summary ?? latestReflectionNote?.body) ??
        dashboardDemo.continuePanel.heroSummary,
      currentFocus: latestSession?.focus ?? dashboardDemo.continuePanel.currentFocus,
      lastReflectionSummary:
        summarizeReflection(latestSession?.summary ?? latestSession?.transcript ?? latestReflectionNote?.body) ??
        dashboardDemo.continuePanel.lastReflectionSummary,
      recommendedPrompt: latestSession?.focus
        ? `Record a 5-minute reflection on ${latestSession.focus.toLowerCase()}.`
        : dashboardDemo.continuePanel.recommendedPrompt,
      weeklyAction: weeklyActions[0]?.title ?? dashboardDemo.continuePanel.weeklyAction,
    },
    storySignals,
    activityPipeline,
    reflections,
    essaySeeds,
    weeklyActions,
    completedThisWeek: completedThisWeek.length ? completedThisWeek : dashboardDemo.completedThisWeek,
    collegeList: colleges,
    knowledgeGraph,
    profileDepth,
    readinessAreas,
    commonAppReadiness,
    ucReadiness,
    profileDiagnosis,
  };
}

function scoreSignals(sourceText: string): StorySignal[] {
  const score = (keywords: string[]) => {
    const text = sourceText.toLowerCase();
    const hits = keywords.reduce((count, keyword) => count + (text.includes(keyword) ? 1 : 0), 0);
    return Math.min(96, 52 + hits * 8);
  };

  return dashboardDemo.storySignals.map((signal) => {
    const keywords =
      signal.label === "Curiosity"
        ? ["curious", "explore", "learn", "question", "research", "why", "how"]
        : signal.label === "Initiative"
          ? ["started", "created", "organized", "launched", "built", "initiated", "led"]
          : signal.label === "Community impact"
            ? ["helped", "community", "tutored", "mentor", "volunteer", "served", "people"]
            : signal.label === "Resilience"
              ? ["hard", "challenge", "setback", "failed", "difficult", "adapt", "problem"]
              : signal.label === "Leadership"
                ? ["lead", "led", "team", "mentor", "coach", "organized", "captain"]
                : ["question", "prototype", "design", "analyze", "experiment", "build", "deep"];
    return { ...signal, strength: score(keywords) };
  });
}

function buildReflections(notes: Note[], sessions: GuidedSession[]): ReflectionCard[] {
  const reflectionNotes = notes
    .filter((note) => note.category.toLowerCase().includes("guided"))
    .slice(0, 3)
    .map((note) => ({
      id: note.id,
      title: note.title,
      date: note.created_at,
      summary: summarize(note.body),
      themes: extractThemes(`${note.title} ${note.body}`),
      sourceLabel: note.category || "Reflection",
      transcriptPreview: note.body.slice(0, 180),
    }));

  const reflectionSessions = sessions.slice(0, 3).map((session) => ({
    id: session.id,
    title: session.session_label,
    date: session.completed_at ?? session.created_at,
    summary: summarize(session.summary ?? session.transcript ?? session.focus ?? ""),
    themes: extractThemes(
      `${session.session_label} ${session.summary ?? session.transcript ?? session.focus ?? ""}`,
    ),
    sourceLabel: "Voice session",
    transcriptPreview: session.transcript?.slice(0, 180),
  }));

  const combined = [...reflectionSessions, ...reflectionNotes]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 4);

  return combined.length >= 3 ? combined : [...combined, ...dashboardDemo.reflections].slice(0, 4);
}

function buildEssaySeeds(signals: StorySignal[], reflections: ReflectionCard[]): EssaySeed[] {
  const topThemes = signals.slice(0, 3).map((signal) => signal.label.toLowerCase());
  const reflectionLead = reflections[0]?.title ?? "a meaningful moment";

  return dashboardDemo.essaySeeds.map((seed, index) => ({
    ...seed,
    relatedTheme: `${seed.relatedTheme} - ${topThemes[index] ?? topThemes[0] ?? "story"}`,
    openingScene:
      index === 0 && reflections[0]
        ? `Start with ${reflectionLead.toLowerCase()} and the exact moment the conversation changed.`
        : seed.openingScene,
  }));
}

function buildActivityPipeline(activities: Activity[]): ActivityPipelineItem[] {
  if (!activities.length) return dashboardDemo.activityPipeline;

  const mapped = activities.map((activity) => {
    const hasImpact = Boolean(activity.impact?.trim());
    const hasRole = Boolean(activity.role?.trim());
    const stage: ActivityPipelineItem["stage"] =
      hasImpact && hasRole ? "Application-ready" : hasImpact || hasRole ? "In progress" : "Raw ideas";

    return {
      title: activity.name,
      description:
        activity.impact?.trim() ||
        activity.role?.trim() ||
        "Add a short description that shows what changed because you were involved.",
      stage,
      nextImprovement:
        stage === "Raw ideas"
          ? "Add your role, who it helped, and one concrete result."
          : stage === "In progress"
            ? "Add a measurable result, size, or outcome."
            : "Trim the wording so the impact is obvious in one line.",
      valueTag: detectValueTag(`${activity.name} ${activity.role ?? ""} ${activity.impact ?? ""}`),
    };
  });

  return [...mapped, ...dashboardDemo.activityPipeline].slice(0, 6);
}

function buildWeeklyActions(
  tasks: StudentTask[],
  session: GuidedSession | undefined,
): WeeklyAction[] {
  const mappedTasks = tasks.slice(0, 3).map((task) => ({
    title: task.title,
    status: mapTaskStatus(task.status),
    timeEstimate: task.status.toLowerCase().includes("done") ? "done" : "15 minutes",
    whyItMatters: "This keeps a live admissions task from staying vague or stalled.",
    suggestedPrompt:
      session?.focus ?? "What is the next smallest step that would make this easier to finish?",
  }));

  return mappedTasks.length >= 3 ? mappedTasks : [...mappedTasks, ...dashboardDemo.weeklyActions].slice(0, 3);
}

function buildCollegeList(colleges: CollegeListEntry[]): CollegeListItem[] {
  return colleges.map((college) => ({
    id: college.id,
    name: college.name,
    location: college.location,
    fitReason: college.fit_reason,
    status: normalizeCollegeStatus(college.status),
    priority: normalizeCollegePriority(college.priority),
    notes: college.notes,
    source: normalizeCollegeSource(college.source),
    lastMentionedAt: college.last_mentioned_at,
  }));
}

function buildKnowledgeGraph({
  activities,
  collegeList,
  memories,
  reflections,
  storySignals,
  weeklyActions,
}: {
  activities: Activity[];
  collegeList: CollegeListItem[];
  memories: StudentMemory[];
  reflections: ReflectionCard[];
  storySignals: StorySignal[];
  weeklyActions: WeeklyAction[];
}): KnowledgeGraph {
  const topSignals = storySignals
    .slice()
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 4)
    .map((signal) => ({
      id: slugify(signal.label),
      label: signal.label,
      strength: signal.strength,
      kind: "theme" as const,
    }));
  const activityNodes = activities.slice(0, 2).map((activity) => ({
    id: `activity-${slugify(activity.name)}`,
    label: compactLabel(activity.name),
    strength: activity.impact?.trim() ? 74 : 58,
    kind: "activity" as const,
  }));
  const collegeNodes = collegeList.slice(0, 2).map((college) => ({
    id: `college-${slugify(college.name)}`,
    label: compactLabel(college.name),
    strength: college.priority === "High" ? 76 : college.priority === "Medium" ? 64 : 52,
    kind: "college" as const,
  }));
  const memoryNodes = memories
    .filter((memory) => memory.memory_type === "theme" || memory.memory_type === "essay_seed")
    .slice(0, 2)
    .map((memory) => ({
      id: `memory-${slugify(memory.label)}`,
      label: compactLabel(memory.label),
      strength: Math.round(56 + memory.confidence * 32),
      kind: memory.memory_type === "theme" ? ("theme" as const) : ("action" as const),
    }));
  const actionNode =
    weeklyActions[0]
      ? [{
          id: "next-action",
          label: "Next action",
          strength: weeklyActions[0].status === "Done" ? 50 : 68,
          kind: "action" as const,
        }]
      : [];
  // Dedupe by id AND by label (case-insensitive). Two nodes can share a label
  // even with different ids (e.g. activity "Robotics" vs theme "Robotics") —
  // the user only wants to see each word once. When labels collide we keep the
  // higher-strength version so the more important node wins.
  const labelKey = (label: string) =>
    label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  type AnyNode =
    | (typeof topSignals)[number]
    | (typeof memoryNodes)[number]
    | (typeof activityNodes)[number]
    | (typeof collegeNodes)[number]
    | (typeof actionNode)[number];
  const byLabel = new Map<string, AnyNode>();
  for (const node of [
    ...topSignals,
    ...memoryNodes,
    ...activityNodes,
    ...collegeNodes,
    ...actionNode,
  ]) {
    const key = labelKey(node.label);
    const existing = byLabel.get(key);
    if (!existing || node.strength > existing.strength) byLabel.set(key, node);
  }
  // Order by strength descending so the biggest/most-important nodes are the
  // ones that survive the slice(0, 8) cap below.
  const nodes = Array.from(byLabel.values())
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 8);

  if (nodes.length < 4) return dashboardDemo.knowledgeGraph;

  const links = nodes.slice(1).map((node, index) => ({
    source: nodes[0].id,
    target: node.id,
    strength: Math.max(42, Math.min(90, Math.round((nodes[0].strength + node.strength) / 2) - index * 3)),
  }));
  const reflectionThemes = new Set(reflections.flatMap((reflection) => reflection.themes.map(slugify)));
  const themeLinks = nodes
    .filter((node) => node.kind !== "theme")
    .flatMap((node) =>
      nodes
        .filter((candidate) => candidate.kind === "theme" && reflectionThemes.has(candidate.id))
        .slice(0, 1)
        .map((candidate) => ({
          source: candidate.id,
          target: node.id,
          strength: Math.min(84, Math.round((candidate.strength + node.strength) / 2)),
        })),
    );

  const seenLinks = new Set<string>();
  const dedupedLinks = [...links, ...themeLinks].filter((link) => {
    const key = `${link.source}-${link.target}`;
    if (seenLinks.has(key)) return false;
    seenLinks.add(key);
    return true;
  });

  return {
    nodes,
    links: dedupedLinks.slice(0, 10),
  };
}

function buildReadinessAreas({
  activities,
  awards,
  collegeList,
  guidedSessions,
  notes,
  essaySeeds,
}: {
  activities: Activity[];
  awards: Award[];
  collegeList: CollegeListEntry[];
  guidedSessions: GuidedSession[];
  notes: Note[];
  reflections: ReflectionCard[];
  essaySeeds: EssaySeed[];
}): DashboardModel["readinessAreas"] {
  const readyActivities = activities.filter(
    (activity) => activity.impact?.trim() && activity.role?.trim(),
  ).length;
  const recommendationPrep = Math.min(
    2,
    (guidedSessions.length > 0 ? 1 : 0) + (notes.length > 0 ? 1 : 0),
  );

  return [
    {
      label: "Activities",
      value: `${activities.length} drafted`,
      detail: `${readyActivities} close to ready`,
      progress: Math.min(100, 30 + activities.length * 8 + readyActivities * 10),
    },
    {
      label: "Essays",
      value: `${essaySeeds.length} seeds`,
      detail: "One story should become a first draft",
      progress: Math.min(100, 20 + essaySeeds.length * 12),
    },
    {
      label: "Awards",
      value: `${awards.length} collected`,
      detail: "Add dates and context",
      progress: Math.min(100, 25 + awards.length * 15),
    },
    {
      label: "Resume",
      value: `${Math.min(activities.length + awards.length, 10)} usable lines`,
      detail: "Built from activities and awards",
      progress: Math.min(100, (activities.length + awards.length) * 8),
    },
    {
      label: "Recommendations",
      value: `${recommendationPrep} prep signals`,
      detail: "Brag sheet material is forming",
      progress: Math.min(100, 25 + recommendationPrep * 25),
    },
    {
      label: "Long-term targets",
      value: collegeList.length ? `${collegeList.length} in play` : "None yet",
      detail: collegeList.length ? "Add fit notes" : "Start with one fit-based target",
      progress: Math.min(100, collegeList.length * 12),
    },
    {
      label: "Exploration",
      value: guidedSessions.length ? "1 thread in motion" : "No active thread",
      detail: "Programs, opportunities, or interests worth pursuing",
      progress: guidedSessions.length ? 45 : 20,
    },
  ];
}

function buildProfileDepth({
  activities,
  awards,
  reflections,
}: {
  activities: Activity[];
  awards: Award[];
  reflections: ReflectionCard[];
}): ProfileDepth {
  const explore = Math.min(activities.length, 8);
  const distinguish = Math.min(awards.length, 6);
  const reflect = Math.min(reflections.length, 12);
  const noData = explore === 0 && distinguish === 0 && reflect === 0;

  if (noData) return dashboardDemo.profileDepth;

  const depthValue = Math.round(
    ((explore / 8 + distinguish / 6 + reflect / 12) / 3) * 100,
  );

  return {
    value: depthValue,
    breakdown: [
      {
        label: "Explore",
        current: explore,
        goal: 8,
        note: "activities & experiences",
        color: "#4e5b7a",
      },
      {
        label: "Distinguish",
        current: distinguish,
        goal: 6,
        note: "awards & leadership",
        color: "#d27b57",
      },
      {
        label: "Reflect",
        current: reflect,
        goal: 12,
        note: "essays & journal entries",
        color: "#efc97a",
      },
    ],
  };
}

function buildCommonAppReadiness({
  activities,
  essaySeeds,
  reflections,
}: {
  activities: Activity[];
  essaySeeds: EssaySeed[];
  reflections: ReflectionCard[];
}): DashboardModel["commonAppReadiness"] {
  const readyActivities = activities.filter(
    (activity) => activity.impact?.trim() && activity.role?.trim(),
  ).length;

  return {
    drafted: activities.length,
    ready: readyActivities,
    needsStrongerImpact: Math.max(0, activities.length - readyActivities),
    missingCategories: [
      essaySeeds.length ? "One tighter essay opening" : "Essay seed",
      reflections.length ? "Reflection-to-activity bridge" : "Reflection",
      readyActivities < 3 ? "Clearer impact statements" : "Resume-ready wording",
    ],
  };
}

function buildUCReadiness({
  activities,
  awards,
  goals,
  notes,
}: {
  activities: Activity[];
  awards: Award[];
  goals: Goal[];
  notes: Note[];
}): DashboardModel["ucReadiness"] {
  const serviceCount = activities.filter((activity) => {
    const text = `${activity.name} ${activity.impact ?? ""}`.toLowerCase();
    return text.includes("community") || text.includes("service") || text.includes("volunteer");
  }).length;

  return {
    activitiesAndAwards: `${activities.length} activity entries, ${awards.length} awards`,
    leadership: activities.some((activity) => activity.role?.trim())
      ? "Leadership is present, but needs sharper wording"
      : "Leadership still needs evidence",
    educationalPreparation: notes.length
      ? "Academic and reflection material are starting to connect"
      : "Needs more academic context",
    volunteering: serviceCount ? `${serviceCount} service-linked stories` : "Service needs proof points",
    awards: awards.length ? `${awards.length} awards or distinctions` : "No awards captured yet",
    gaps: [
      goals.length ? "Use school-fit notes to guide the list" : "Add school-fit notes",
      activities.length < 4 ? "Add more complete activity lines" : "Tighten activity wording",
      awards.length < 2 ? "Add more award detail" : "Keep awards concise",
    ],
  };
}

function buildDiagnosis({
  activities,
  awards,
  guidedSessions,
  storySignals,
}: {
  activities: Activity[];
  awards: Award[];
  guidedSessions: GuidedSession[];
  storySignals: StorySignal[];
}): DashboardModel["profileDiagnosis"] {
  const topSignals = storySignals.slice(0, 3).map((signal) => signal.label.toLowerCase());

  return {
    strengths: [
      `A clear mix of ${topSignals.join(", ") || "curiosity and initiative"} is emerging.`,
      activities.some((activity) => activity.impact?.trim())
        ? "Some activities already have useful raw material."
        : "The raw material is present, but impact language needs work.",
      guidedSessions.length
        ? "Reflections are producing essay material instead of random notes."
        : "A few more reflections will help the story land.",
    ],
    needsWork: [
      activities.some((activity) => !activity.impact?.trim())
        ? "Some activities still need a stronger result."
        : "Activity language is getting clearer.",
      awards.length < 2 ? "Awards and proof points are still light." : "Awards are present.",
      "The application story should narrow to one or two lanes.",
    ],
    nextAction:
      "Take one reflection and convert it into a sharper activity line, then keep only the best essay seed.",
  };
}

function summarize(text: string | null | undefined) {
  if (!text) return "No summary yet.";
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length <= 180 ? cleaned : `${cleaned.slice(0, 177).trimEnd()}...`;
}

function summarizeLead(text: string | null | undefined) {
  if (!text) return null;
  const cleaned = text.replace(/\s+/g, " ").trim();
  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0] ?? cleaned;
  if (firstSentence.length <= 96) return firstSentence;
  return `${firstSentence.slice(0, 93).trimEnd()}...`;
}

function summarizeReflection(text: string | null | undefined) {
  if (!text) return null;
  const cleaned = text
    .replace(/\b(Student|Coach|Assistant):/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0] ?? cleaned;
  const summary = firstSentence.length > 140 ? `${firstSentence.slice(0, 137).trimEnd()}...` : firstSentence;

  return summary || null;
}

function extractThemes(text: string) {
  const lower = text.toLowerCase();
  const themes = [
    lower.includes("lead") || lower.includes("team") ? "leadership" : null,
    lower.includes("help") || lower.includes("service") || lower.includes("community")
      ? "community impact"
      : null,
    lower.includes("build") || lower.includes("design") || lower.includes("prototype")
      ? "intellectual exploration"
      : null,
    lower.includes("hard") || lower.includes("challenge") || lower.includes("setback")
      ? "resilience"
      : null,
    lower.includes("curious") || lower.includes("explore") ? "curiosity" : null,
  ].filter((item): item is string => Boolean(item));

  return themes.length ? themes : ["reflection"];
}

function detectValueTag(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("service") || lower.includes("help") || lower.includes("volunteer")) return "service";
  if (lower.includes("lead") || lower.includes("team") || lower.includes("mentor")) return "leadership";
  if (lower.includes("design") || lower.includes("build") || lower.includes("create")) return "creativity";
  if (lower.includes("research") || lower.includes("analyze") || lower.includes("learn")) {
    return "intellectual vitality";
  }
  if (lower.includes("community")) return "community impact";
  return undefined;
}

function normalizeCollegeStatus(status: string): CollegeListItem["status"] {
  return collegeStatuses.includes(status as CollegeListItem["status"])
    ? (status as CollegeListItem["status"])
    : "Dream";
}

function normalizeCollegePriority(priority: string): CollegeListItem["priority"] {
  return collegePriorities.includes(priority as CollegeListItem["priority"])
    ? (priority as CollegeListItem["priority"])
    : "Medium";
}

function normalizeCollegeSource(source: string): CollegeListItem["source"] {
  return source === "conversation" || source === "imported" ? source : "manual";
}

/**
 * Pre-generated starfield positions for the Knowledge Graph nebula background.
 * Deterministic (seeded LCG) so the same stars appear across renders — defined
 * at module scope so React never recreates them.
 */
const GALAXY_STARS = (() => {
  let seed = 12345;
  const next = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const stars: Array<{
    x: number;
    y: number;
    r: number;
    bright: number;
    delay: number;
    dur: number;
  }> = [];
  for (let i = 0; i < 70; i++) {
    stars.push({
      x: next() * 760,
      y: next() * 230,
      r: 0.25 + next() * 0.9,
      bright: 0.35 + next() * 0.55,
      delay: next() * 5,
      dur: 2.5 + next() * 4,
    });
  }
  return stars;
})();

function layoutGraphNodes(nodes: KnowledgeGraphNode[]) {
  const positions = [
    { x: 382, y: 118 },
    { x: 198, y: 70 },
    { x: 566, y: 66 },
    { x: 128, y: 166 },
    { x: 630, y: 160 },
    { x: 382, y: 42 },
    { x: 306, y: 190 },
    { x: 470, y: 192 },
  ];

  return nodes.map((node, index) => ({
    ...node,
    ...(positions[index] ?? positions[positions.length - 1]),
  }));
}

function nodeFill(_kind: KnowledgeGraphNode["kind"]) {
  // All bubbles are white — importance is conveyed by size, not color.
  return "#ffffff";
}

function satelliteOffsets(seed: string) {
  const base = seed.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  const count = 3 + (base % 3);

  return Array.from({ length: count }, (_, index) => {
    const angle = ((base + index * 73) % 360) * (Math.PI / 180);
    const distance = 22 + ((base + index * 11) % 30);
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance * 0.72,
      cx: Math.cos(angle + 0.7) * distance * 0.42,
      cy: Math.sin(angle + 0.7) * distance * 0.28,
    };
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function compactLabel(value: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 18) return cleaned;
  return `${cleaned.slice(0, 15).trimEnd()}...`;
}

function mapTaskStatus(status: string): WeeklyAction["status"] {
  const lower = status.toLowerCase();
  if (lower.includes("done") || lower.includes("complete")) return "Done";
  if (lower.includes("progress") || lower.includes("doing") || lower.includes("started")) {
    return "In progress";
  }
  return "Not started";
}
