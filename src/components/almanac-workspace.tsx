"use client";

import {
  BookOpen,
  CalendarClock,
  Compass,
  Leaf,
  LogOut,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  PanelTopClose,
  PanelTopOpen,
  Plus,
  ListTodo,
  Settings,
} from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { signOut } from "@/app/actions";
import { createActivity, updateProfilePreferences } from "@/app/dashboard/actions";
import { DashboardView } from "@/components/dashboard-view";
import { GuidedSessionsView } from "@/components/guided-sessions-view";
import type {
  Activity,
  Award,
  CollegeListEntry,
  Goal,
  GuidedSession,
  Note,
  ProfilePreferences,
  StudentTask,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";

type Tab =
  | "overview"
  | "activities"
  | "discover"
  | "goals"
  | "sessions"
  | "action-plan"
  | "timeline";

type AlmanacWorkspaceProps = {
  userEmail: string | null;
  notes: Note[];
  goals: Goal[];
  guidedSessions: GuidedSession[];
  tasks: StudentTask[];
  activities: Activity[];
  awards: Award[];
  collegeList: CollegeListEntry[];
  profile: ProfilePreferences | null;
  initialTab?: string;
};

const palette = {
  paper: "#ECE6E0",
  paperDeep: "#DFD7CF",
  ink: "#1F2433",
  inkSoft: "rgba(31,36,51,0.64)",
  inkFaint: "rgba(31,36,51,0.16)",
  rule: "rgba(31,36,51,0.11)",
  olive: "#3F4A66",
  sage: "#7A86A8",
  clay: "#C97A5D",
  butter: "#E0B26B",
};

const nav = [
  { id: "overview", label: "Dashboard", icon: BookOpen },
  { id: "sessions", label: "Guided Session", icon: NotebookPen },
  { id: "action-plan", label: "Action plan", icon: ListTodo },
  { id: "timeline", label: "Timeline", icon: CalendarClock },
  { id: "discover", label: "Discover", icon: Compass },
] satisfies Array<{ id: Tab; label: string; icon: typeof BookOpen }>;

export function AlmanacWorkspace({
  userEmail,
  notes,
  goals,
  guidedSessions,
  tasks,
  activities,
  awards,
  collegeList,
  profile,
  initialTab,
}: AlmanacWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTabState] = useState<Tab>(
    initialTab === "overview" ||
      initialTab === "sessions" ||
      initialTab === "activities" ||
      initialTab === "goals" ||
      initialTab === "action-plan" ||
      initialTab === "timeline" ||
      initialTab === "discover"
      ? initialTab
      : "overview",
  );
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [navLayout, setNavLayoutState] = useState<"left" | "top">(
    profile?.nav_layout === "top" ? "top" : "left",
  );
  const [navCollapsed, setNavCollapsedState] = useState(Boolean(profile?.nav_collapsed));
  const [topNavCollapsed, setTopNavCollapsedState] = useState(Boolean(profile?.top_nav_collapsed));
  const [customName, setCustomNameState] = useState(
    profile?.display_name?.trim() || profile?.full_name?.trim() || "",
  );

  useEffect(() => {
    if (profile) return;
    const saved = localStorage.getItem("cultvr-nav-layout");
    const savedCollapsed = localStorage.getItem("cultvr-nav-collapsed");
    const savedTopCollapsed = localStorage.getItem("cultvr-top-nav-collapsed");
    if (saved === "left" || saved === "top") setNavLayoutState(saved); // eslint-disable-line react-hooks/set-state-in-effect
    if (savedCollapsed === "true") setNavCollapsedState(true);
    if (savedTopCollapsed === "true") setTopNavCollapsedState(true);
  }, [profile]);

  function persistProfilePreferences(input: Parameters<typeof updateProfilePreferences>[0]) {
    void updateProfilePreferences(input).catch(() => undefined);
  }

  const setNavLayout = (v: "left" | "top") => {
    setNavLayoutState(v);
    localStorage.setItem("cultvr-nav-layout", v);
    persistProfilePreferences({ navLayout: v });
    setPrefsOpen(false);
  };

  const setNavCollapsed = (value: boolean) => {
    setNavCollapsedState(value);
    localStorage.setItem("cultvr-nav-collapsed", String(value));
    persistProfilePreferences({ navCollapsed: value });
    setPrefsOpen(false);
  };

  const setTopNavCollapsed = (value: boolean) => {
    setTopNavCollapsedState(value);
    localStorage.setItem("cultvr-top-nav-collapsed", String(value));
    persistProfilePreferences({ topNavCollapsed: value });
    setPrefsOpen(false);
  };

  const setCustomName = (value: string) => {
    setCustomNameState(value);
    persistProfilePreferences({ displayName: value });
  };

  const setTab = (next: Tab) => {
    setTabState(next);

    const params = new URLSearchParams(searchParams.toString());
    if (next === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", next);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  const firstName = customName || getDisplayName(userEmail);

  return (
    <main
      className="min-h-[100dvh] overflow-x-hidden text-[color:var(--almanac-ink)] lg:h-[100dvh] lg:overflow-hidden"
      style={
        {
          "--almanac-paper": palette.paper,
          "--almanac-paper-deep": palette.paperDeep,
          "--almanac-ink": palette.ink,
          "--almanac-ink-soft": palette.inkSoft,
          "--almanac-rule": palette.rule,
          "--almanac-olive": palette.olive,
          "--almanac-sage": palette.sage,
          "--almanac-clay": palette.clay,
          "--almanac-butter": palette.butter,
          backgroundColor: palette.paper,
          backgroundImage: `radial-gradient(${palette.inkFaint} 0.6px, transparent 0.6px), radial-gradient(${palette.inkFaint} 0.5px, transparent 0.5px)`,
          backgroundPosition: "0 0, 7px 11px",
          backgroundSize: "14px 14px, 22px 22px",
        } as React.CSSProperties
      }
    >
      <div
        className={["flex min-h-[100dvh] lg:h-full", navLayout === "top" ? "flex-col" : ""].join(" ")}
      >
        {navLayout === "left" ? (
          <aside
            className={[
              "hidden max-h-[100dvh] shrink-0 flex-col overflow-x-hidden overflow-y-auto border-r border-[color:var(--almanac-rule)] bg-black/[0.018] py-7 transition-[width,padding] duration-200 lg:flex",
              navCollapsed ? "w-20 px-3" : "w-64 px-6",
            ].join(" ")}
          >
            <div
              className={[
                "flex items-center",
                navCollapsed ? "flex-col justify-center gap-3" : "justify-between gap-3",
              ].join(" ")}
            >
              <Brand compact={navCollapsed} />
              <button
                aria-label={navCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="hidden size-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--almanac-rule)] text-[color:var(--almanac-ink-soft)] transition hover:bg-black/[0.035] hover:text-[color:var(--almanac-ink)] lg:flex"
                onClick={() => setNavCollapsed(!navCollapsed)}
                title={navCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                type="button"
              >
                {navCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              </button>
            </div>
            <nav className="mt-10 grid gap-1">
              {nav.map((item) => {
                const active = tab === item.id;
                return (
                  <button
                    className={[
                      "flex items-center rounded-lg py-2.5 text-sm font-medium transition",
                      navCollapsed ? "justify-center px-2" : "gap-3 px-3 text-left",
                      active
                        ? "bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]"
                        : "text-[color:var(--almanac-ink)] hover:bg-black/[0.035]",
                    ].join(" ")}
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    title={item.label}
                    type="button"
                  >
                    <item.icon
                      className={[
                        "shrink-0",
                        active ? "text-[color:var(--almanac-paper)]" : "text-[color:var(--almanac-ink-soft)]",
                      ].join(" ")}
                      size={16}
                    />
                    {navCollapsed ? null : item.label}
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto grid gap-2">
              <div className="relative">
                <button
                  className={[
                    "flex w-full items-center rounded-lg border border-[color:var(--almanac-rule)] py-2.5 text-sm font-medium text-[color:var(--almanac-ink)] hover:bg-black/[0.035]",
                    navCollapsed ? "justify-center px-2" : "gap-3 px-4 text-left",
                  ].join(" ")}
                  onClick={() => setPrefsOpen((v) => !v)}
                  title="Settings"
                  type="button"
                >
                  <Settings size={16} className="text-[color:var(--almanac-ink-soft)]" />
                  {navCollapsed ? null : "Settings"}
                </button>
                <PrefsPopup
                  customName={customName}
                  direction="up"
                  navLayout={navLayout}
                  open={prefsOpen}
                  setCustomName={setCustomName}
                  setNavLayout={setNavLayout}
                />
              </div>
              <form action={signOut}>
                <button
                  className={[
                    "flex w-full items-center rounded-lg border border-[color:var(--almanac-rule)] py-2.5 text-sm font-medium text-[color:var(--almanac-ink)]",
                    navCollapsed ? "justify-center px-2" : "gap-3 px-4 text-left",
                  ].join(" ")}
                  title="Sign out"
                >
                  <LogOut size={16} />
                  {navCollapsed ? null : "Sign out"}
                </button>
              </form>
            </div>
          </aside>
        ) : (
          <TopBar
            customName={customName}
            navLayout={navLayout}
            prefsOpen={prefsOpen}
            setCustomName={setCustomName}
            setNavLayout={setNavLayout}
            setPrefsOpen={setPrefsOpen}
            setTopNavCollapsed={setTopNavCollapsed}
            setTab={setTab}
            tab={tab}
            topNavCollapsed={topNavCollapsed}
          />
        )}

        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <MobileBar
            customName={customName}
            navLayout={navLayout}
            prefsOpen={prefsOpen}
            setCustomName={setCustomName}
            setNavLayout={setNavLayout}
            setPrefsOpen={setPrefsOpen}
            setTab={setTab}
            tab={tab}
          />
          {tab === "overview" ? (
            <DashboardView
              awards={awards}
              collegeList={collegeList}
              firstName={firstName}
              goals={goals}
              guidedSessions={guidedSessions}
              notes={notes}
              onNavigateTab={(next) => setTab(next)}
              tasks={tasks}
              activities={activities}
            />
          ) : null}
          {tab === "activities" ? <ActivitiesView activities={activities} /> : null}
          {tab === "discover" ? <DiscoverView /> : null}
          {tab === "goals" ? <GoalsView goals={goals} /> : null}
          {tab === "sessions" ? <GuidedSessionsView notes={notes} /> : null}
          {tab === "action-plan" ? <ActionPlanView /> : null}
          {tab === "timeline" ? (
            <TimelineView activities={activities} awards={awards} notes={notes} />
          ) : null}
        </section>
      </div>

      {prefsOpen ? (
        <div className="fixed inset-0 z-40" onClick={() => setPrefsOpen(false)} />
      ) : null}
    </main>
  );
}

function PrefsPopup({
  open,
  direction,
  navLayout,
  setNavLayout,
  customName,
  setCustomName,
}: {
  open: boolean;
  direction: "up" | "down";
  navLayout: "left" | "top";
  setNavLayout: (v: "left" | "top") => void;
  customName: string;
  setCustomName: (v: string) => void;
}) {
  const [nameInput, setNameInput] = useState(customName);

  const posClass = direction === "up" ? "bottom-full left-0 mb-2" : "top-full right-0 mt-1";
  const slideClass = open
    ? "translate-y-0 opacity-100 pointer-events-auto"
    : direction === "up"
      ? "translate-y-1 opacity-0 pointer-events-none"
      : "-translate-y-1 opacity-0 pointer-events-none";

  return (
    <div
      className={[
        "absolute z-50 w-60 rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-4 text-[0.875rem] shadow-xl transition-all duration-150",
        posClass,
        slideClass,
      ].join(" ")}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="mb-3 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
        Settings
      </p>

      <div>
        <p className="mb-1.5 text-[0.74rem] font-medium text-[color:var(--almanac-ink-soft)]">
          Display name
        </p>
        <input
          className="h-9 w-full rounded-lg border border-[color:var(--almanac-rule)] bg-white/60 px-3 text-[0.88rem] font-medium outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[color:var(--almanac-olive)]"
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="Your name"
          type="text"
          value={nameInput}
        />
        <button
          className="mt-1.5 h-8 w-full rounded-lg bg-[color:var(--almanac-ink)] text-[0.75rem] font-medium text-[color:var(--almanac-paper)]"
          onClick={() => setCustomName(nameInput)}
          type="button"
        >
          Save
        </button>
      </div>

      <div className="mt-4">
        <p className="mb-1.5 text-[0.74rem] font-medium text-[color:var(--almanac-ink-soft)]">
          Layout
        </p>
        <div className="flex gap-1.5">
          {(["left", "top"] as const).map((layout) => (
            <button
              className={[
                "rounded-md px-2.5 py-1 text-[0.75rem] font-medium transition",
                navLayout === layout
                  ? "bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]"
                  : "text-[color:var(--almanac-ink-soft)] hover:text-[color:var(--almanac-ink)]",
              ].join(" ")}
              key={layout}
              onClick={() => setNavLayout(layout)}
              type="button"
            >
              {layout === "left" ? "Left" : "Top"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TopBar({
  tab,
  setTab,
  prefsOpen,
  setPrefsOpen,
  navLayout,
  setNavLayout,
  customName,
  setCustomName,
  setTopNavCollapsed,
  topNavCollapsed,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  navLayout: "left" | "top";
  prefsOpen: boolean;
  setPrefsOpen: (fn: (v: boolean) => boolean) => void;
  setNavLayout: (v: "left" | "top") => void;
  customName: string;
  setCustomName: (v: string) => void;
  setTopNavCollapsed: (v: boolean) => void;
  topNavCollapsed: boolean;
}) {
  return (
    <header
      className={[
        "hidden shrink-0 items-center justify-between border-b border-[color:var(--almanac-rule)] px-8 lg:flex",
        topNavCollapsed ? "gap-3 py-3" : "gap-6 py-4",
      ].join(" ")}
    >
      <Brand compact={topNavCollapsed} />

      <div className="flex min-w-0 items-center gap-4 xl:gap-6">
        <nav
          className={[
            "flex min-w-0 items-center",
            topNavCollapsed ? "gap-2" : "gap-6 text-sm",
          ].join(" ")}
        >
          {nav.map((item) => {
            const active = tab === item.id;
            return (
              <button
                className={[
                  "flex items-center font-medium transition",
                  topNavCollapsed ? "gap-2 rounded-full px-3 py-2 text-[0.84rem]" : "text-sm",
                  active
                    ? "text-[#111622]"
                    : topNavCollapsed
                      ? "text-[color:var(--almanac-ink-soft)] hover:text-[color:var(--almanac-ink)]"
                      : "text-[color:var(--almanac-ink-soft)] hover:text-[color:var(--almanac-ink)]",
                ].join(" ")}
                key={item.id}
                onClick={() => setTab(item.id)}
                aria-label={item.label}
                title={item.label}
                type="button"
              >
                {topNavCollapsed ? <item.icon size={16} /> : null}
                {topNavCollapsed ? null : item.label}
              </button>
            );
          })}
        </nav>
        <div className="flex items-center gap-1 border-l border-[color:var(--almanac-rule)] pl-4">
          <NavIconBtn
            ariaLabel={topNavCollapsed ? "Expand top navigation" : "Collapse top navigation"}
            label={topNavCollapsed ? "Expand top navigation" : "Collapse top navigation"}
            onClick={() => setTopNavCollapsed(!topNavCollapsed)}
          >
            {topNavCollapsed ? <PanelTopOpen size={16} /> : <PanelTopClose size={16} />}
          </NavIconBtn>
          <div className="relative">
            <NavIconBtn
              label="Settings"
              onClick={() => setPrefsOpen((v) => !v)}
            >
              <Settings size={16} />
            </NavIconBtn>
            <PrefsPopup
              customName={customName}
              direction="down"
              navLayout={navLayout}
              open={prefsOpen}
              setCustomName={setCustomName}
              setNavLayout={setNavLayout}
            />
          </div>

          <form action={signOut}>
            <NavIconBtn label="Sign out" type="submit">
              <LogOut size={16} />
            </NavIconBtn>
          </form>
        </div>
      </div>
    </header>
  );
}

function NavIconBtn({
  children,
  label,
  onClick,
  active = false,
  ariaLabel,
  type = "button",
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  ariaLabel?: string;
  type?: "button" | "submit";
}) {
  return (
    <div className="group relative">
      <button
        className={[
          "flex size-9 items-center justify-center rounded-full transition",
          active
            ? "bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]"
            : "text-[color:var(--almanac-ink-soft)] hover:bg-black/[0.06] hover:text-[color:var(--almanac-ink)]",
        ].join(" ")}
        aria-label={ariaLabel ?? label}
        onClick={onClick}
        type={type}
      >
        {children}
      </button>
      <span className="pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-[color:var(--almanac-ink)] px-2 py-1 text-[0.68rem] text-[color:var(--almanac-paper)] opacity-0 transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </div>
  );
}

function ActivitiesView({ activities }: { activities: Activity[] }) {
  return (
    <Scrollable>
      <PageHeader
        action={<AddButton label="Add activity" />}
        eyebrow={`${activities.length} logged`}
        title={
          <>
            Your{" "}
            <em className="font-serif italic text-[color:var(--almanac-olive)]">
              activities
            </em>
          </>
        }
      />
      <div className="grid gap-4 px-5 py-6 md:px-9">
        <InlineActivityForm />
        {activities.map((activity) => (
          <article
            className="grid gap-5 rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-5 md:grid-cols-[1fr_8rem_8rem]"
            key={activity.id}
          >
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
                Experience
              </p>
              <h2 className="mt-2 font-serif text-2xl leading-tight">
                {activity.name}
              </h2>
              <p className="mt-1 text-sm text-[color:var(--almanac-ink-soft)]">
                {activity.role || "Role not set"}
              </p>
              {activity.impact ? (
                <p className="mt-3 text-sm leading-6">{activity.impact}</p>
              ) : null}
            </div>
            <Metric label="Years" value={activity.years || "—"} />
            <Metric label="Added" value={shortDate(activity.created_at)} />
          </article>
        ))}
        {!activities.length ? <Empty label="No activities yet." /> : null}
      </div>
    </Scrollable>
  );
}


function GoalsView({ goals }: { goals: Goal[] }) {
  return (
    <Scrollable>
      <PageHeader
        eyebrow={`${goals.length} logged`}
        title={
          <>
            Your{" "}
            <em className="font-serif italic text-[color:var(--almanac-clay)]">
              goals
            </em>
          </>
        }
      />
      <div className="grid gap-4 px-5 py-6 md:px-9">
        {goals.map((goal) => (
          <article
            className="flex items-start justify-between gap-6 rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-5"
            key={goal.id}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
                Goal
              </p>
              <h2 className="mt-2 font-serif text-2xl leading-tight">{goal.title}</h2>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
                Target
              </p>
              <p className="mt-2 font-serif text-xl">{formatDate(goal.target_date)}</p>
            </div>
          </article>
        ))}
        {!goals.length ? <Empty label="No goals yet." /> : null}
      </div>
    </Scrollable>
  );
}

function DiscoverView() {
  const resources = [
    {
      category: "Essay Prompts",
      title: "Common App Essay Prompts 2025–26",
      description: "Seven prompts, 650 words. Pick the one that lets your authentic voice through.",
      color: palette.olive,
    },
    {
      category: "Scholarships",
      title: "QuestBridge National College Match",
      description: "Full four-year scholarships for high-achieving students with financial need.",
      color: palette.clay,
    },
    {
      category: "Testing",
      title: "SAT & ACT Calendar",
      description: "Key registration deadlines and test dates for the upcoming cycle.",
      color: palette.butter,
    },
    {
      category: "College Research",
      title: "Naviance College Search",
      description: "Compare acceptance rates, GPA ranges, and scattergrams from your school.",
      color: palette.sage,
    },
    {
      category: "Financial Aid",
      title: "FAFSA Opening Date",
      description: "The 2026-27 FAFSA opened by October 1, 2025. File early for priority aid.",
      color: palette.olive,
    },
    {
      category: "Deadlines",
      title: "Early Decision vs. Early Action",
      description: "Understand binding vs. non-binding early applications before November deadlines.",
      color: palette.clay,
    },
  ];

  return (
    <Scrollable>
      <PageHeader
        eyebrow="Curated for you"
        title={
          <>
            <em className="font-serif italic text-[color:var(--almanac-sage)]">Discover</em>
          </>
        }
      />
      <div className="grid gap-4 px-5 py-6 md:grid-cols-2 md:px-9 xl:grid-cols-3">
        {resources.map((item) => (
          <article
            className="flex flex-col gap-3 rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-5"
            key={item.title}
          >
            <p
              className="text-[0.68rem] uppercase tracking-[0.16em]"
              style={{ color: item.color }}
            >
              {item.category}
            </p>
            <h2 className="font-serif text-2xl leading-tight">{item.title}</h2>
            <p className="text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
              {item.description}
            </p>
          </article>
        ))}
      </div>
    </Scrollable>
  );
}

function ActionPlanView() {
  const [window, setWindow] = useState<"weekly" | "monthly">("weekly");

  const planByWindow = {
    weekly: {
      kicker: "Weekly plan",
      title: "This week",
      summary:
        "Keep the next seven days focused on immediate conversations, deadlines, and evidence to collect.",
      items: [
        { label: "Priority", value: "Turn one strong story into a usable application draft." },
        { label: "Actions", value: "Talk through evidence, capture notes, and identify any gaps." },
        { label: "Check-in", value: "Review what was captured and confirm the next step." },
      ],
    },
    monthly: {
      kicker: "Monthly plan",
      title: "This month",
      summary:
        "Use the month view to keep longer goals, application progress, and reflection aligned.",
      items: [
        { label: "Priority", value: "Build a fuller picture of strengths, interests, and direction." },
        { label: "Actions", value: "Revisit sessions, refine stories, and organize follow-up tasks." },
        { label: "Check-in", value: "Assess what is ready, what needs work, and what to do next." },
      ],
    },
  }[window];

  return (
    <Scrollable>
      <PageHeader
        eyebrow="Planning"
        title={
          <>
            Action{" "}
            <em className="font-serif italic text-[color:var(--almanac-sage)]">plan</em>
          </>
        }
      />
      <div className="px-5 py-6 md:px-9">
        <div className="inline-flex rounded-full border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-1">
          {(["weekly", "monthly"] as const).map((item) => (
            <button
              className={[
                "rounded-full px-4 py-2 text-sm font-medium transition",
                window === item
                  ? "bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]"
                  : "text-[color:var(--almanac-ink-soft)] hover:text-[color:var(--almanac-ink)]",
              ].join(" ")}
              key={item}
              onClick={() => setWindow(item)}
              type="button"
            >
              {item === "weekly" ? "Weekly" : "Monthly"}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
          <section className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-5 md:p-6">
            <SectionKicker>{planByWindow.kicker}</SectionKicker>
            <h2 className="mt-2 font-serif text-3xl leading-tight text-[color:var(--almanac-ink)]">
              {planByWindow.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
              {planByWindow.summary}
            </p>
            <div className="mt-5 grid gap-3">
              {planByWindow.items.map((item) => (
                <article
                  className="rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-4"
                  key={item.label}
                >
                  <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--almanac-ink)]">
                    {item.value}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <aside className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-5 md:p-6">
            <SectionKicker>What this is for</SectionKicker>
            <div className="mt-4 grid gap-3">
              <Empty
                label={
                  window === "weekly"
                    ? "Weekly plans keep the next conversation and the next deadline in view."
                    : "Monthly plans keep the bigger arc visible without cluttering the workspace."
                }
              />
              <div className="rounded-xl border border-dashed border-[color:var(--almanac-rule)] px-4 py-5 text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
                Later this can be generated from the student profile, saved sessions, and memory.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Scrollable>
  );
}

function TimelineView({
  activities,
  awards,
  notes,
}: {
  activities: Activity[];
  awards: Award[];
  notes: Note[];
}) {
  const items = [
    ...activities.map((item) => ({
      id: item.id,
      date: item.created_at,
      kind: "activity",
      title: item.name,
      color: palette.olive,
    })),
    ...awards.map((item) => ({
      id: item.id,
      date: item.created_at,
      kind: "award",
      title: item.name,
      color: palette.clay,
    })),
    ...notes.map((item) => ({
      id: item.id,
      date: item.created_at,
      kind: item.category,
      title: item.title,
      color: palette.butter,
    })),
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

  return (
    <Scrollable>
      <PageHeader
        eyebrow="grades 9 → 12"
        title={
          <>
            Your{" "}
            <em className="font-serif italic text-[color:var(--almanac-sage)]">
              timeline
            </em>
          </>
        }
      />
      <div className="px-5 py-8 md:px-9">
        <div className="relative rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-6 md:p-8">
          <div className="absolute bottom-8 left-[6.15rem] top-8 hidden w-px bg-[color:var(--almanac-rule)] sm:block" />
          <div className="grid gap-5">
            {items.map((item) => (
              <article
                className="grid gap-3 sm:grid-cols-[4.5rem_1.5rem_1fr] sm:gap-5"
                key={`${item.kind}-${item.id}`}
              >
                <p className="font-serif italic text-[color:var(--almanac-ink-soft)] sm:text-right">
                  {shortDate(item.date)}
                </p>
                <div className="hidden justify-center pt-1 sm:flex">
                  <span
                    className="relative z-10 size-3.5 rounded-full border-2 border-[color:var(--almanac-paper)]"
                    style={{ backgroundColor: item.color }}
                  />
                </div>
                <div className="rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] px-4 py-3">
                  <p className="text-[0.68rem] uppercase tracking-[0.16em]" style={{ color: item.color }}>
                    {item.kind}
                  </p>
                  <h2 className="mt-1 font-serif text-xl leading-tight">
                    {item.title}
                  </h2>
                </div>
              </article>
            ))}
            {!items.length ? <Empty label="No timeline entries yet." /> : null}
          </div>
        </div>
      </div>
    </Scrollable>
  );
}

function InlineActivityForm() {
  return (
    <CaptureForm action={createActivity} icon={<Leaf size={16} />} title="Activity">
      <TextInput name="name" placeholder="Robotics team" required />
      <div className="grid gap-2 sm:grid-cols-2">
        <TextInput name="role" placeholder="Role" />
        <TextInput name="years" placeholder="Years active" />
      </div>
      <TextArea name="impact" placeholder="Impact, leadership, outcomes" />
      <Submit>Add activity</Submit>
    </CaptureForm>
  );
}

function CaptureForm({
  action,
  children,
  icon,
  title,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <form
      action={action}
      className="rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-4"
    >
      <h3 className="flex items-center gap-2 font-serif text-xl">
        <span className="flex size-8 items-center justify-center rounded-full bg-[color:var(--almanac-olive)] text-[color:var(--almanac-paper)]">
          {icon}
        </span>
        {title}
      </h3>
      <div className="mt-4 grid gap-2">{children}</div>
    </form>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-11 rounded-lg border border-[color:var(--almanac-rule)] bg-white/60 px-3 text-sm outline-none focus:border-[color:var(--almanac-olive)]"
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="min-h-24 rounded-lg border border-[color:var(--almanac-rule)] bg-white/60 px-3 py-2 text-sm outline-none focus:border-[color:var(--almanac-olive)]"
    />
  );
}

function Submit({ children }: { children: React.ReactNode }) {
  return (
    <button className="mt-1 h-10 rounded-lg bg-[color:var(--almanac-ink)] px-4 text-sm font-medium text-[color:var(--almanac-paper)]">
      {children}
    </button>
  );
}

function MobileBar({
  customName,
  navLayout,
  prefsOpen,
  setCustomName,
  setNavLayout,
  setPrefsOpen,
  setTab,
  tab,
}: {
  customName: string;
  navLayout: "left" | "top";
  prefsOpen: boolean;
  setCustomName: (v: string) => void;
  setNavLayout: (v: "left" | "top") => void;
  setPrefsOpen: (fn: (v: boolean) => boolean) => void;
  setTab: (tab: Tab) => void;
  tab: Tab;
}) {
  return (
    <header className="border-b border-[color:var(--almanac-rule)] px-5 py-4 lg:hidden">
      <div className="flex items-center justify-between gap-4">
        <Brand />
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              aria-label="Settings"
              className="flex size-10 items-center justify-center rounded-full border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] text-[color:var(--almanac-ink)]"
              onClick={() => setPrefsOpen((v) => !v)}
              type="button"
            >
              <Settings size={18} />
            </button>
            <PrefsPopup
              customName={customName}
              direction="down"
              navLayout={navLayout}
              open={prefsOpen}
              setCustomName={setCustomName}
              setNavLayout={setNavLayout}
            />
          </div>
          <form action={signOut}>
            <button
              aria-label="Sign out"
              className="flex size-10 items-center justify-center rounded-full border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] text-[color:var(--almanac-ink)]"
            >
              <LogOut size={18} />
            </button>
          </form>
        </div>
      </div>
      <nav className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {nav.map((item) => {
          const active = tab === item.id;
          return (
            <button
              className={[
                "flex h-10 shrink-0 items-center gap-2 rounded-full px-3 text-sm",
                active
                  ? "bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]"
                  : "bg-[color:var(--almanac-paper-deep)] text-[color:var(--almanac-ink)]",
              ].join(" ")}
              key={item.id}
              onClick={() => setTab(item.id)}
              type="button"
            >
              <item.icon size={15} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}

function PageHeader({
  action,
  eyebrow,
  title,
}: {
  action?: React.ReactNode;
  eyebrow: string;
  title: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 border-b border-[color:var(--almanac-rule)] px-5 py-7 md:flex-row md:items-end md:justify-between md:px-9">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--almanac-ink-soft)]">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-serif text-4xl leading-none md:text-5xl">
          {title}
        </h1>
      </div>
      {action ? <div className="flex items-center gap-3">{action}</div> : null}
    </header>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={["flex items-center", compact ? "justify-center" : "gap-3"].join(" ")}>
      <span className="flex size-11 items-center justify-center rounded-full bg-[color:var(--almanac-ink)] font-serif text-2xl italic leading-none text-[color:var(--almanac-paper)]">
        c
      </span>
      {compact ? null : <p className="font-serif text-[2.15rem] italic leading-none">cultvr</p>}
    </div>
  );
}


function AddButton({
  label,
  tone = "olive",
}: {
  label: string;
  tone?: "olive" | "clay" | "ink";
}) {
  const color =
    tone === "clay"
      ? "bg-[color:var(--almanac-clay)]"
      : tone === "ink"
        ? "bg-[color:var(--almanac-ink)]"
        : "bg-[color:var(--almanac-olive)]";
  return (
    <span
      className={`inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-[color:var(--almanac-paper)] ${color}`}
    >
      <Plus size={16} />
      {label}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
        {label}
      </p>
      <p className="mt-2 font-serif text-2xl">{value}</p>
    </div>
  );
}

function SectionKicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[color:var(--almanac-ink-soft)]">
      {children}
    </p>
  );
}

function Scrollable({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
      {children}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[color:var(--almanac-rule)] p-5 text-sm text-[color:var(--almanac-ink-soft)]">
      {label}
    </div>
  );
}

function getDisplayName(email: string | null) {
  if (!email) return "Student";
  const local = email.split("@")[0] || "Student";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function shortDate(date: string | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}


