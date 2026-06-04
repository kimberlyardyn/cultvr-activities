"use client";

import {
  BookOpen,
  CalendarClock,
  Compass,
  Download,
  Leaf,
  LogOut,
  Moon,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  PanelTopClose,
  PanelTopOpen,
  Plus,
  ListTodo,
  Settings,
  Sun,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { signOut } from "@/app/actions";
import {
  createActivity,
  updateProfilePreferences,
  updateStudentAdmissionsProfile,
} from "@/app/dashboard/actions";
import { AdminInstructionsSection } from "@/components/admin-instructions-section";
import { PdfDoc, docTitle } from "@/lib/pdf-doc";
import { DashboardView } from "@/components/dashboard-view";
import { DiscoverView } from "@/components/discover-view";
import { GuidedSessionsView } from "@/components/guided-sessions-view";
import { TimelineBoard } from "@/components/timeline-board";
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
import {
  CURRENT_PRIORITY_OPTIONS,
  USER_IDENTITY_OPTIONS,
  type CurrentPriority,
  type UserIdentity,
} from "@/lib/student-profile";
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
  studentMemories: StudentMemory[];
  studentProfile: StudentAdmissionsProfile | null;
  weeklyChallenges: WeeklyChallenge[];
  initialTab?: string;
};

const palettes = {
  paper: {
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
  },
  dark: {
    paper: "#1A1D28",
    paperDeep: "#10131C",
    ink: "#ECE6E0",
    inkSoft: "rgba(236,230,224,0.66)",
    inkFaint: "rgba(236,230,224,0.18)",
    rule: "rgba(236,230,224,0.12)",
    olive: "#9FB1D9",
    sage: "#A8B5D6",
    clay: "#E89978",
    butter: "#F0C988",
  },
} as const;
const palette = palettes.paper;

const nav = [
  { id: "overview", label: "Dashboard", icon: BookOpen },
  { id: "sessions", label: "Guided Session", icon: NotebookPen },
  { id: "action-plan", label: "Action Plan", icon: ListTodo },
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
  studentMemories,
  studentProfile,
  weeklyChallenges,
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
  const [appearance, setAppearanceState] = useState<"paper" | "dark">(
    profile?.appearance === "dark" ? "dark" : "paper",
  );
  const [fontFamily, setFontFamilyState] = useState<"serif" | "sans">(
    profile?.font_family === "sans" ? "sans" : "serif",
  );
  const [admissionsProfile, setAdmissionsProfileState] = useState(studentProfile);

  const activePalette = palettes[appearance];

  useEffect(() => {
    if (profile) return;
    const saved = localStorage.getItem("cultvr-nav-layout");
    const savedCollapsed = localStorage.getItem("cultvr-nav-collapsed");
    const savedTopCollapsed = localStorage.getItem("cultvr-top-nav-collapsed");
    const savedAppearance = localStorage.getItem("cultvr-appearance");
    const savedFont = localStorage.getItem("cultvr-font-family");
    if (saved === "left" || saved === "top") setNavLayoutState(saved); // eslint-disable-line react-hooks/set-state-in-effect
    if (savedCollapsed === "true") setNavCollapsedState(true);
    if (savedTopCollapsed === "true") setTopNavCollapsedState(true);
    if (savedAppearance === "paper" || savedAppearance === "dark") setAppearanceState(savedAppearance);
    if (savedFont === "serif" || savedFont === "sans") setFontFamilyState(savedFont);
  }, [profile]);

  // Await the server action so it actually completes before any subsequent
  // navigation (e.g. clicking Sign out) can cancel the in-flight request.
  // Errors are surfaced to the console for diagnosis rather than swallowed.
  async function persistProfilePreferences(
    input: Parameters<typeof updateProfilePreferences>[0],
  ) {
    try {
      const result = await updateProfilePreferences(input);
      if (result && "ok" in result && !result.ok) {
        console.error("Profile preference save failed:", result.error);
      }
    } catch (err) {
      console.error("Profile preference save threw:", err);
    }
  }

  const setNavLayout = async (v: "left" | "top") => {
    setNavLayoutState(v);
    localStorage.setItem("cultvr-nav-layout", v);
    await persistProfilePreferences({ navLayout: v });
    setPrefsOpen(false);
  };

  const setNavCollapsed = async (value: boolean) => {
    setNavCollapsedState(value);
    localStorage.setItem("cultvr-nav-collapsed", String(value));
    await persistProfilePreferences({ navCollapsed: value });
    setPrefsOpen(false);
  };

  const setTopNavCollapsed = async (value: boolean) => {
    setTopNavCollapsedState(value);
    localStorage.setItem("cultvr-top-nav-collapsed", String(value));
    await persistProfilePreferences({ topNavCollapsed: value });
    setPrefsOpen(false);
  };

  const setCustomName = async (value: string) => {
    setCustomNameState(value);
    await persistProfilePreferences({ displayName: value });
  };

  const setAppearance = async (value: "paper" | "dark") => {
    setAppearanceState(value);
    localStorage.setItem("cultvr-appearance", value);
    await persistProfilePreferences({ appearance: value });
  };

  const setFontFamily = async (value: "serif" | "sans") => {
    setFontFamilyState(value);
    localStorage.setItem("cultvr-font-family", value);
    await persistProfilePreferences({ fontFamily: value });
  };

  const setStudentProfile = async (
    value: Parameters<typeof updateStudentAdmissionsProfile>[0],
  ) => {
    const now = new Date().toISOString();
    setAdmissionsProfileState((current) => ({
      user_id: current?.user_id ?? "",
      date_of_birth: value.dateOfBirth?.trim() || null,
      user_identity: value.userIdentity || null,
      location: value.location?.trim() || null,
      grade_level: value.gradeLevel?.trim() || null,
      current_priority: value.currentPriority || null,
      coaching_style: value.coachingStyle ?? "encouraging",
      personality_notes: value.personalityNotes?.trim() || null,
      created_at: current?.created_at ?? now,
      updated_at: now,
    }));

    const result = await updateStudentAdmissionsProfile(value);
    if (result && "ok" in result && !result.ok) {
      console.error("Student profile save failed:", result.error);
    }
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

  // Cross-tab navigation requests (e.g. "Deepen this activity" from the
  // Activities list) dispatch a window event rather than threading a callback
  // through every layer. Honor it here with the router-aware setTab.
  useEffect(() => {
    function handleNavigate(event: Event) {
      const next = (event as CustomEvent<{ tab?: string }>).detail?.tab;
      if (
        next === "overview" ||
        next === "sessions" ||
        next === "activities" ||
        next === "goals" ||
        next === "action-plan" ||
        next === "timeline" ||
        next === "discover"
      ) {
        setTab(next);
      }
    }
    window.addEventListener("cultvr:navigate-tab", handleNavigate);
    return () => window.removeEventListener("cultvr:navigate-tab", handleNavigate);
  });

  const firstName = customName || getDisplayName(userEmail);

  return (
    <main
      className="min-h-[100dvh] overflow-x-hidden text-[color:var(--almanac-ink)] lg:h-[100dvh] lg:overflow-hidden"
      data-cultvr-font={fontFamily}
      data-cultvr-appearance={appearance}
      style={
        {
          "--almanac-paper": activePalette.paper,
          "--almanac-paper-deep": activePalette.paperDeep,
          "--almanac-ink": activePalette.ink,
          "--almanac-ink-soft": activePalette.inkSoft,
          "--almanac-rule": activePalette.rule,
          "--almanac-olive": activePalette.olive,
          "--almanac-sage": activePalette.sage,
          "--almanac-clay": activePalette.clay,
          "--almanac-butter": activePalette.butter,
          backgroundColor: activePalette.paper,
          backgroundImage: `radial-gradient(${activePalette.inkFaint} 0.6px, transparent 0.6px), radial-gradient(${activePalette.inkFaint} 0.5px, transparent 0.5px)`,
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
                  appearance={appearance}
                  customName={customName}
                  direction="up"
                  fontFamily={fontFamily}
                  navLayout={navLayout}
                  open={prefsOpen}
                  setAppearance={setAppearance}
                  setCustomName={setCustomName}
                  setFontFamily={setFontFamily}
                  setNavLayout={setNavLayout}
                  setStudentProfile={setStudentProfile}
                  studentProfile={admissionsProfile}
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
            appearance={appearance}
            customName={customName}
            fontFamily={fontFamily}
            navLayout={navLayout}
            prefsOpen={prefsOpen}
            setAppearance={setAppearance}
            setCustomName={setCustomName}
            setFontFamily={setFontFamily}
            setNavLayout={setNavLayout}
            setStudentProfile={setStudentProfile}
            studentProfile={admissionsProfile}
            setPrefsOpen={setPrefsOpen}
            setTopNavCollapsed={setTopNavCollapsed}
            setTab={setTab}
            tab={tab}
            topNavCollapsed={topNavCollapsed}
          />
        )}

        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <MobileBar
            appearance={appearance}
            customName={customName}
            fontFamily={fontFamily}
            navLayout={navLayout}
            prefsOpen={prefsOpen}
            setAppearance={setAppearance}
            setCustomName={setCustomName}
            setFontFamily={setFontFamily}
            setNavLayout={setNavLayout}
            setStudentProfile={setStudentProfile}
            studentProfile={admissionsProfile}
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
              studentMemories={studentMemories}
              studentProfile={admissionsProfile}
              tasks={tasks}
              activities={activities}
              weeklyChallenges={weeklyChallenges}
            />
          ) : null}
          {tab === "activities" ? <ActivitiesView activities={activities} /> : null}
          {tab === "discover" ? <DiscoverView /> : null}
          {tab === "goals" ? <GoalsView goals={goals} /> : null}
          {tab === "sessions" ? (
            <GuidedSessionsView activities={activities} awards={awards} notes={notes} />
          ) : null}
          {tab === "action-plan" ? (
            <ActionPlanView
              goals={goals}
              ownerName={firstName}
              weeklyChallenges={weeklyChallenges}
            />
          ) : null}
          {tab === "timeline" ? (
            <TimelineView
              activities={activities}
              awards={awards}
              notes={notes}
              goals={goals}
              ownerName={firstName}
              weeklyChallenges={weeklyChallenges}
            />
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
  studentProfile,
  setStudentProfile,
  customName,
  setCustomName,
  appearance,
  setAppearance,
  fontFamily,
  setFontFamily,
}: {
  open: boolean;
  direction: "up" | "down";
  navLayout: "left" | "top";
  setNavLayout: (v: "left" | "top") => void | Promise<void>;
  studentProfile: StudentAdmissionsProfile | null;
  setStudentProfile: (
    value: Parameters<typeof updateStudentAdmissionsProfile>[0],
  ) => void | Promise<void>;
  customName: string;
  setCustomName: (v: string) => void | Promise<void>;
  appearance: "paper" | "dark";
  setAppearance: (v: "paper" | "dark") => void | Promise<void>;
  fontFamily: "serif" | "sans";
  setFontFamily: (v: "serif" | "sans") => void | Promise<void>;
}) {
  const [nameInput, setNameInput] = useState(customName);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [studentSaveState, setStudentSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [dateOfBirth, setDateOfBirth] = useState(studentProfile?.date_of_birth ?? "");
  const [userIdentity, setUserIdentity] = useState<UserIdentity | "">(
    studentProfile?.user_identity ?? "",
  );
  const [location, setLocation] = useState(studentProfile?.location ?? "");
  const [gradeLevel, setGradeLevel] = useState(studentProfile?.grade_level ?? "");
  const [currentPriority, setCurrentPriority] = useState<CurrentPriority | "">(
    studentProfile?.current_priority ?? "",
  );
  const [coachingStyle, setCoachingStyle] = useState<
    "direct" | "encouraging" | "structured" | "exploratory"
  >(studentProfile?.coaching_style ?? "encouraging");
  const [personalityNotes, setPersonalityNotes] = useState(
    studentProfile?.personality_notes ?? "",
  );

  // Keep the input in sync if customName updates from outside (e.g. profile reload).
  // React-canonical "derive state from prop" pattern — compare against a tracked
  // copy of the prop and only push the new value when it actually changes.
  const [lastSeenCustomName, setLastSeenCustomName] = useState(customName);
  if (lastSeenCustomName !== customName) {
    setLastSeenCustomName(customName);
    setNameInput(customName);
  }

  const [lastSeenStudentProfile, setLastSeenStudentProfile] = useState(studentProfile);
  if (lastSeenStudentProfile !== studentProfile) {
    setLastSeenStudentProfile(studentProfile);
    setDateOfBirth(studentProfile?.date_of_birth ?? "");
    setUserIdentity(studentProfile?.user_identity ?? "");
    setLocation(studentProfile?.location ?? "");
    setGradeLevel(studentProfile?.grade_level ?? "");
    setCurrentPriority(studentProfile?.current_priority ?? "");
    setCoachingStyle(studentProfile?.coaching_style ?? "encouraging");
    setPersonalityNotes(studentProfile?.personality_notes ?? "");
  }

  async function handleSaveName() {
    if (saveState === "saving") return;
    setSaveState("saving");
    try {
      await setCustomName(nameInput);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1400);
    } catch {
      setSaveState("idle");
    }
  }

  async function handleSaveStudentProfile() {
    if (studentSaveState === "saving") return;
    setStudentSaveState("saving");
    try {
      await setStudentProfile({
        dateOfBirth,
        userIdentity,
        location,
        gradeLevel,
        currentPriority,
        coachingStyle,
        personalityNotes,
      });
      setStudentSaveState("saved");
      setTimeout(() => setStudentSaveState("idle"), 1400);
    } catch {
      setStudentSaveState("idle");
    }
  }
  const popupRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const el = popupRef.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;

    const measure = () => {
      const rect = parent.getBoundingClientRect();
      const popupWidth = el.offsetWidth;
      const popupHeight = el.offsetHeight;
      const margin = 8;
      let top: number;
      let left: number;
      if (direction === "up") {
        top = rect.top - popupHeight - margin;
        left = rect.left;
      } else {
        top = rect.bottom + 4;
        left = rect.right - popupWidth;
      }
      // Keep within viewport
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      left = Math.max(8, Math.min(left, vw - popupWidth - 8));
      top = Math.max(8, Math.min(top, vh - popupHeight - 8));
      setCoords({ top, left });
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, direction]);

  const slideClass = open
    ? "translate-y-0 opacity-100 pointer-events-auto"
    : direction === "up"
      ? "translate-y-1 opacity-0 pointer-events-none"
      : "-translate-y-1 opacity-0 pointer-events-none";

  return (
    <div
      className={[
        "fixed z-50 max-h-[min(42rem,calc(100vh-1rem))] w-[20rem] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-5 text-[0.875rem] shadow-xl transition-all duration-150",
        slideClass,
      ].join(" ")}
      onClick={(e) => e.stopPropagation()}
      ref={popupRef}
      style={
        coords
          ? { top: coords.top, left: coords.left }
          : { top: -9999, left: -9999, visibility: open ? "hidden" : undefined }
      }
    >
      <p className="mb-4 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
        Preferences
      </p>

      {/* Display name */}
      <div className="pb-4">
        <p className="mb-1.5 text-[0.74rem] font-medium text-[color:var(--almanac-ink-soft)]">
          Display name
        </p>
        <div className="flex gap-2">
          <input
            className="h-9 flex-1 rounded-lg border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] px-3 text-[0.88rem] font-medium text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[color:var(--almanac-olive)]"
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Your name"
            type="text"
            value={nameInput}
          />
          <button
            className="h-9 min-w-[3.5rem] rounded-lg bg-[color:var(--almanac-ink)] px-3 text-[0.75rem] font-medium text-[color:var(--almanac-paper)] transition disabled:opacity-70"
            disabled={saveState === "saving"}
            onClick={handleSaveName}
            type="button"
          >
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      {/* Appearance */}
      <div className="flex items-center justify-between border-t border-[color:var(--almanac-rule)] py-3.5">
        <span className="text-[0.88rem] font-medium text-[color:var(--almanac-ink)]">
          Appearance
        </span>
        <div className="flex gap-1 rounded-lg border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-0.5">
          <button
            aria-label="Paper"
            className={[
              "flex size-8 items-center justify-center rounded-md transition",
              appearance === "paper"
                ? "bg-[color:var(--almanac-paper)] text-[color:var(--almanac-ink)] shadow-sm"
                : "text-[color:var(--almanac-ink-soft)] hover:text-[color:var(--almanac-ink)]",
            ].join(" ")}
            onClick={() => setAppearance("paper")}
            title="Paper"
            type="button"
          >
            <Sun size={16} strokeWidth={1.7} />
          </button>
          <button
            aria-label="Dark"
            className={[
              "flex size-8 items-center justify-center rounded-md transition",
              appearance === "dark"
                ? "bg-[color:var(--almanac-paper)] text-[color:var(--almanac-ink)] shadow-sm"
                : "text-[color:var(--almanac-ink-soft)] hover:text-[color:var(--almanac-ink)]",
            ].join(" ")}
            onClick={() => setAppearance("dark")}
            title="Dark"
            type="button"
          >
            <Moon size={16} strokeWidth={1.7} />
          </button>
        </div>
      </div>

      {/* Font */}
      <div className="flex items-center justify-between border-t border-[color:var(--almanac-rule)] py-3.5">
        <span className="text-[0.88rem] font-medium text-[color:var(--almanac-ink)]">
          Font
        </span>
        <div className="flex gap-1 rounded-lg border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-0.5">
          {(["serif", "sans"] as const).map((value) => (
            <button
              className={[
                "rounded-md px-3 py-1.5 text-[0.78rem] font-medium transition",
                fontFamily === value
                  ? "bg-[color:var(--almanac-paper)] text-[color:var(--almanac-ink)] shadow-sm"
                  : "text-[color:var(--almanac-ink-soft)] hover:text-[color:var(--almanac-ink)]",
                value === "serif" ? "font-serif italic" : "",
              ].join(" ")}
              key={value}
              onClick={() => setFontFamily(value)}
              type="button"
            >
              {value === "serif" ? "Serif" : "Sans"}
            </button>
          ))}
        </div>
      </div>

      {/* Student profile */}
      <details className="border-t border-[color:var(--almanac-rule)] py-3.5">
        <summary className="cursor-pointer list-none text-[0.88rem] font-medium text-[color:var(--almanac-ink)]">
          Student profile
        </summary>
        <div className="mt-3 grid gap-2.5">
          <SettingsInput
            label="Date of birth"
            onChange={setDateOfBirth}
            placeholder=""
            type="date"
            value={dateOfBirth}
          />
          <SettingsSelect
            label="User identity"
            onChange={(v) => setUserIdentity(v as UserIdentity | "")}
            options={USER_IDENTITY_OPTIONS}
            placeholder="Select identity"
            value={userIdentity}
          />
          <SettingsInput
            label="Location"
            onChange={setLocation}
            placeholder="City, State / Country"
            value={location}
          />
          <SettingsInput
            label="Grade/year"
            onChange={setGradeLevel}
            placeholder="11th grade"
            value={gradeLevel}
          />
          <SettingsSelect
            label="Current priority"
            onChange={(v) => setCurrentPriority(v as CurrentPriority | "")}
            options={CURRENT_PRIORITY_OPTIONS}
            placeholder="Select priority"
            value={currentPriority}
          />
          <div>
            <p className="mb-1.5 text-[0.72rem] font-medium text-[color:var(--almanac-ink-soft)]">
              Coaching style
            </p>
            <div className="grid grid-cols-2 gap-1">
              {(["encouraging", "direct", "structured", "exploratory"] as const).map((style) => (
                <button
                  className={[
                    "rounded-md border border-[color:var(--almanac-rule)] px-2 py-1.5 text-[0.72rem] capitalize transition",
                    coachingStyle === style
                      ? "bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]"
                      : "text-[color:var(--almanac-ink-soft)] hover:text-[color:var(--almanac-ink)]",
                  ].join(" ")}
                  key={style}
                  onClick={() => setCoachingStyle(style)}
                  type="button"
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
          <SettingsTextArea
            label="How should Cultvr adapt?"
            onChange={setPersonalityNotes}
            placeholder="I like specific examples and shorter questions."
            value={personalityNotes}
          />
          <button
            className="h-9 rounded-lg bg-[color:var(--almanac-ink)] px-3 text-[0.75rem] font-medium text-[color:var(--almanac-paper)] transition disabled:opacity-70"
            disabled={studentSaveState === "saving"}
            onClick={handleSaveStudentProfile}
            type="button"
          >
            {studentSaveState === "saving"
              ? "Saving..."
              : studentSaveState === "saved"
                ? "Saved"
                : "Save student profile"}
          </button>
        </div>
      </details>

      {/* AI instructions — renders only for the administrator account */}
      <AdminInstructionsSection />

      {/* Layout */}
      <div className="flex items-center justify-between border-t border-[color:var(--almanac-rule)] py-3.5">
        <span className="text-[0.88rem] font-medium text-[color:var(--almanac-ink)]">
          Layout
        </span>
        <div className="flex gap-1 rounded-lg border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-0.5">
          {(["left", "top"] as const).map((layout) => (
            <button
              className={[
                "rounded-md px-3 py-1.5 text-[0.78rem] font-medium transition",
                navLayout === layout
                  ? "bg-[color:var(--almanac-paper)] text-[color:var(--almanac-ink)] shadow-sm"
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

function SettingsInput({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "text" | "date";
  value: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[0.72rem] font-medium text-[color:var(--almanac-ink-soft)]">
        {label}
      </span>
      <input
        className="h-9 rounded-lg border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] px-3 text-[0.82rem] text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[color:var(--almanac-olive)]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function SettingsSelect({
  label,
  onChange,
  options,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[0.72rem] font-medium text-[color:var(--almanac-ink-soft)]">
        {label}
      </span>
      <select
        className="h-9 rounded-lg border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] px-3 text-[0.82rem] text-[color:var(--almanac-ink)] outline-none focus:border-[color:var(--almanac-olive)]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SettingsTextArea({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[0.72rem] font-medium text-[color:var(--almanac-ink-soft)]">
        {label}
      </span>
      <textarea
        className="min-h-20 resize-y rounded-lg border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] px-3 py-2 text-[0.82rem] leading-5 text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[color:var(--almanac-olive)]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}


function TopBar({
  tab,
  setTab,
  prefsOpen,
  setPrefsOpen,
  navLayout,
  setNavLayout,
  setStudentProfile,
  customName,
  setCustomName,
  studentProfile,
  setTopNavCollapsed,
  topNavCollapsed,
  appearance,
  setAppearance,
  fontFamily,
  setFontFamily,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  navLayout: "left" | "top";
  prefsOpen: boolean;
  setPrefsOpen: (fn: (v: boolean) => boolean) => void;
  setNavLayout: (v: "left" | "top") => void | Promise<void>;
  setStudentProfile: (
    value: Parameters<typeof updateStudentAdmissionsProfile>[0],
  ) => void | Promise<void>;
  customName: string;
  setCustomName: (v: string) => void | Promise<void>;
  studentProfile: StudentAdmissionsProfile | null;
  setTopNavCollapsed: (v: boolean) => void | Promise<void>;
  topNavCollapsed: boolean;
  appearance: "paper" | "dark";
  setAppearance: (v: "paper" | "dark") => void | Promise<void>;
  fontFamily: "serif" | "sans";
  setFontFamily: (v: "serif" | "sans") => void | Promise<void>;
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
                    ? "text-[color:var(--almanac-ink)]"
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
              appearance={appearance}
              customName={customName}
              direction="down"
              fontFamily={fontFamily}
              navLayout={navLayout}
              open={prefsOpen}
              setAppearance={setAppearance}
              setCustomName={setCustomName}
              setFontFamily={setFontFamily}
              setNavLayout={setNavLayout}
              setStudentProfile={setStudentProfile}
              studentProfile={studentProfile}
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

// ── Action Plan — shared constants ──────────────────────────────────────────

const PLAN_WINDOWS = [
  {
    id: "weekly" as const,
    label: "Weekly",
    description:
      "Keep this week's most urgent moves in view — what's actionable right now and due soon.",
  },
  {
    id: "monthly" as const,
    label: "Monthly",
    description:
      "Track steady progress over the next 30 days: deadlines approaching, stories to develop, applications to research.",
  },
  {
    id: "1year" as const,
    label: "1 Year",
    description:
      "Build the arc of the year. Set the milestones and goals that will define your application narrative.",
  },
  {
    id: "longterm" as const,
    label: "Long-term",
    description:
      "Bigger aspirations beyond the next year — college-fit research, long-range goals, and the vision you're building toward.",
  },
];

type PlanWindowId = (typeof PLAN_WINDOWS)[number]["id"];

const SECTION_DEFS = {
  priority: { id: "priority" as const, label: "Priority", color: "#C97A5D" },
  secondary: { id: "secondary" as const, label: "Secondary", color: "#3F4A66" },
  reaches: { id: "reaches" as const, label: "Reaches", color: "#C97A5D" },
  targets: { id: "targets" as const, label: "Targets", color: "#3F4A66" },
};

type PlanSectionId = keyof typeof SECTION_DEFS;
type SectionDef = (typeof SECTION_DEFS)[PlanSectionId];

// Which sections render in each window's layout, in order.
const SECTIONS_BY_WINDOW: Record<PlanWindowId, PlanSectionId[]> = {
  weekly: ["priority", "secondary"],
  monthly: ["priority", "secondary"],
  "1year": ["reaches", "targets"],
  longterm: ["reaches", "targets"],
};

// Where goals and challenges auto-populate for each window.
// Goals are concrete things with a date → they're "Targets" in long-range
// planning; "Priority" for short-range.
function autoPopSection(window: PlanWindowId): PlanSectionId {
  return window === "1year" || window === "longterm" ? "targets" : "priority";
}

type ManualItem = {
  id: string;
  text: string;
  done: boolean;
  bold?: boolean;
  notes?: string[];
};
type PlanStore = Record<PlanWindowId, Record<PlanSectionId, ManualItem[]>>;

const EMPTY_PLAN_STORE: PlanStore = {
  weekly: { priority: [], secondary: [], reaches: [], targets: [] },
  monthly: { priority: [], secondary: [], reaches: [], targets: [] },
  "1year": { priority: [], secondary: [], reaches: [], targets: [] },
  longterm: { priority: [], secondary: [], reaches: [], targets: [] },
};

function goalToWindow(goal: Goal): PlanWindowId {
  if (!goal.target_date) return "longterm";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil(
    (new Date(goal.target_date).getTime() - today.getTime()) / 86_400_000,
  );
  if (diff <= 7) return "weekly";
  if (diff <= 30) return "monthly";
  if (diff <= 365) return "1year";
  return "longterm";
}

function parsePlanStore(raw: string | null): PlanStore {
  if (!raw) return EMPTY_PLAN_STORE;
  try {
    const parsed = JSON.parse(raw) as Partial<PlanStore>;
    const out: PlanStore = {
      weekly: { priority: [], secondary: [], reaches: [], targets: [] },
      monthly: { priority: [], secondary: [], reaches: [], targets: [] },
      "1year": { priority: [], secondary: [], reaches: [], targets: [] },
      longterm: { priority: [], secondary: [], reaches: [], targets: [] },
    };
    const allSectionIds: PlanSectionId[] = [
      "priority",
      "secondary",
      "reaches",
      "targets",
    ];
    for (const w of PLAN_WINDOWS) {
      const pw = parsed[w.id];
      if (pw) {
        for (const sectionId of allSectionIds) {
          const arr = pw[sectionId];
          if (Array.isArray(arr)) out[w.id][sectionId] = arr as ManualItem[];
        }
      }
    }
    return out;
  } catch {
    return EMPTY_PLAN_STORE;
  }
}

// ── ActionPlanView ──────────────────────────────────────────────────────────

function ActionPlanView({
  goals,
  ownerName,
  weeklyChallenges,
}: {
  goals: Goal[];
  ownerName: string;
  weeklyChallenges: WeeklyChallenge[];
}) {
  const [activeWindow, setActiveWindow] = useState<PlanWindowId>("weekly");
  const [store, setStoreState] = useState<PlanStore>(EMPTY_PLAN_STORE);
  const [ready, setReady] = useState(false);
  const [exportSelection, setExportSelection] = useState<Set<PlanWindowId>>(
    () => new Set(PLAN_WINDOWS.map((w) => w.id)),
  );
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    setStoreState(parsePlanStore(localStorage.getItem("cultvr-action-plan-v3")));
    setReady(true);
  }, []);

  function handleExport() {
    setExportOpen(false);

    const windows = PLAN_WINDOWS.filter((w) => exportSelection.has(w.id));
    const pdf = new PdfDoc();
    pdf.add({ type: "title", text: docTitle(ownerName, "Action Plan") });
    pdf.add({
      type: "subtitle",
      text: windows.map((w) => w.label).join(" · ") || "No windows selected",
    });
    pdf.add({ type: "rule" });

    for (const w of windows) {
      pdf.add({ type: "heading", text: w.label });
      pdf.add({ type: "muted", text: w.description });

      const windowGoals = goals.filter((g) => goalToWindow(g) === w.id);
      const windowChallenges =
        w.id === "weekly"
          ? weeklyChallenges.filter((c) => c.status === "active")
          : [];
      const autoSec = autoPopSection(w.id);

      for (const sectionId of SECTIONS_BY_WINDOW[w.id]) {
        const sec = SECTION_DEFS[sectionId];
        const items = store[w.id][sectionId];
        const showAuto = sectionId === autoSec;
        const autoGoals = showAuto ? windowGoals : [];
        const autoChallenges = showAuto ? windowChallenges : [];

        if (!items.length && !autoGoals.length && !autoChallenges.length) continue;

        pdf.add({ type: "subheading", text: sec.label });
        for (const g of autoGoals) {
          const due = g.target_date
            ? ` (due ${new Date(g.target_date).toLocaleDateString("en", {
                month: "short",
                day: "numeric",
              })})`
            : "";
          pdf.add({ type: "bullet", text: `${g.title}${due}  [Goal]` });
        }
        for (const c of autoChallenges) {
          pdf.add({ type: "bullet", text: `${c.title}  [Challenge]` });
        }
        for (const item of items) {
          pdf.add({ type: "bullet", text: `${item.done ? "[x] " : "[ ] "}${item.text}` });
          for (const note of item.notes ?? []) {
            pdf.add({ type: "muted", text: `      - ${note}` });
          }
        }
      }
      pdf.add({ type: "space" });
    }

    pdf.save(docTitle(ownerName, "Action Plan").replace(/[^a-z0-9]+/gi, "-").toLowerCase());
  }

  function updateStore(updater: (prev: PlanStore) => PlanStore) {
    setStoreState((prev) => {
      const next = updater(prev);
      localStorage.setItem("cultvr-action-plan-v3", JSON.stringify(next));
      return next;
    });
  }

  function addItem(section: PlanSectionId, text: string) {
    const item: ManualItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: text.trim(),
      done: false,
    };
    updateStore((s) => ({
      ...s,
      [activeWindow]: {
        ...s[activeWindow],
        [section]: [...s[activeWindow][section], item],
      },
    }));
  }

  function toggleItem(section: PlanSectionId, id: string) {
    updateStore((s) => ({
      ...s,
      [activeWindow]: {
        ...s[activeWindow],
        [section]: s[activeWindow][section].map((i) =>
          i.id === id ? { ...i, done: !i.done } : i,
        ),
      },
    }));
  }

  function editItem(section: PlanSectionId, id: string, update: Partial<ManualItem>) {
    updateStore((s) => ({
      ...s,
      [activeWindow]: {
        ...s[activeWindow],
        [section]: s[activeWindow][section].map((i) =>
          i.id === id ? { ...i, ...update } : i,
        ),
      },
    }));
  }

  function removeItem(section: PlanSectionId, id: string) {
    updateStore((s) => ({
      ...s,
      [activeWindow]: {
        ...s[activeWindow],
        [section]: s[activeWindow][section].filter((i) => i.id !== id),
      },
    }));
  }

  const windowGoals = goals.filter((g) => goalToWindow(g) === activeWindow);
  const windowChallenges =
    activeWindow === "weekly"
      ? weeklyChallenges.filter((c) => c.status === "active")
      : [];
  const activeWindowDef = PLAN_WINDOWS.find((w) => w.id === activeWindow)!;

  return (
    <Scrollable>
      <div className="print:hidden">
        <PageHeader
          eyebrow="Planning"
          title={
            <>
              Action{" "}
              <em className="font-serif italic text-[color:var(--almanac-sage)]">Plan</em>
            </>
          }
        />
      </div>
      <div className="px-5 py-6 md:px-9 print:hidden">
        {/* Toolbar: window tabs (left) + Export (right) */}
        <div className="flex items-start justify-between gap-3">
          <div className="overflow-x-auto">
            <div className="inline-flex min-w-max gap-1 rounded-full border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-1">
              {PLAN_WINDOWS.map((w) => (
                <button
                  className={[
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    activeWindow === w.id
                      ? "bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]"
                      : "text-[color:var(--almanac-ink-soft)] hover:text-[color:var(--almanac-ink)]",
                  ].join(" ")}
                  key={w.id}
                  onClick={() => setActiveWindow(w.id)}
                  type="button"
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Export */}
          <div className="relative shrink-0">
            <button
              aria-label="Export to PDF"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] px-3 text-xs font-medium text-[color:var(--almanac-ink-soft)] transition hover:text-[color:var(--almanac-ink)]"
              onClick={() => setExportOpen((v) => !v)}
              title="Export to PDF"
              type="button"
            >
              <Download size={14} />
              Export
            </button>

            {exportOpen ? (
              <div
                className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-4 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
                  Include in PDF
                </p>
                <div className="grid gap-1.5">
                  {PLAN_WINDOWS.map((w) => {
                    const checked = exportSelection.has(w.id);
                    return (
                      <label
                        className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-0.5 hover:bg-[color:var(--almanac-paper-deep)]"
                        key={w.id}
                      >
                        <input
                          checked={checked}
                          className="size-4 accent-[color:var(--almanac-ink)]"
                          onChange={() => {
                            setExportSelection((prev) => {
                              const next = new Set(prev);
                              if (next.has(w.id)) next.delete(w.id);
                              else next.add(w.id);
                              return next;
                            });
                          }}
                          type="checkbox"
                        />
                        <span className="text-sm text-[color:var(--almanac-ink)]">
                          {w.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-3 flex gap-3 border-t border-[color:var(--almanac-rule)] pt-3 text-[0.7rem]">
                  <button
                    className="text-[color:var(--almanac-ink-soft)] underline hover:text-[color:var(--almanac-ink)]"
                    onClick={() =>
                      setExportSelection(new Set(PLAN_WINDOWS.map((w) => w.id)))
                    }
                    type="button"
                  >
                    All
                  </button>
                  <button
                    className="text-[color:var(--almanac-ink-soft)] underline hover:text-[color:var(--almanac-ink)]"
                    onClick={() => setExportSelection(new Set([activeWindow]))}
                    type="button"
                  >
                    Current only
                  </button>
                  <button
                    className="text-[color:var(--almanac-ink-soft)] underline hover:text-[color:var(--almanac-ink)]"
                    onClick={() => setExportSelection(new Set())}
                    type="button"
                  >
                    None
                  </button>
                </div>
                <button
                  className="mt-3 h-9 w-full rounded-lg bg-[color:var(--almanac-ink)] text-sm font-medium text-[color:var(--almanac-paper)] transition disabled:opacity-40"
                  disabled={exportSelection.size === 0}
                  onClick={handleExport}
                  type="button"
                >
                  Export to PDF
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Window description */}
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
          {activeWindowDef.description}
        </p>

        {ready ? (
          <div className="mt-6 grid gap-5">
            {SECTIONS_BY_WINDOW[activeWindow].map((sectionId) => {
              const sec = SECTION_DEFS[sectionId];
              const isAuto = sectionId === autoPopSection(activeWindow);
              return (
                <PlanColumn
                  challenges={isAuto ? windowChallenges : []}
                  goals={isAuto ? windowGoals : []}
                  items={store[activeWindow][sec.id]}
                  key={sec.id}
                  onAdd={(text) => addItem(sec.id, text)}
                  onDelete={(id) => removeItem(sec.id, id)}
                  onEdit={(id, update) => editItem(sec.id, id, update)}
                  onToggle={(id) => toggleItem(sec.id, id)}
                  section={sec}
                />
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Outside-click overlay for the export popover */}
      {exportOpen ? (
        <div
          className="fixed inset-0 z-40 print:hidden"
          onClick={() => setExportOpen(false)}
        />
      ) : null}

      {/* Print-only output */}
      <PrintableActionPlan
        goals={goals}
        selection={exportSelection}
        store={store}
        weeklyChallenges={weeklyChallenges}
      />

      {/* Print CSS — hide everything else, show only the printable block */}
      <style jsx global>{`
        @media print {
          nav,
          aside,
          [data-action-plan-print="true"] ~ *,
          .print\\:hidden {
            display: none !important;
          }
          body {
            background: white !important;
          }
          [data-action-plan-print="true"] {
            display: block !important;
          }
        }
      `}</style>
    </Scrollable>
  );
}

// ── PrintableActionPlan ─────────────────────────────────────────────────────

function PrintableActionPlan({
  goals,
  selection,
  store,
  weeklyChallenges,
}: {
  goals: Goal[];
  selection: Set<PlanWindowId>;
  store: PlanStore;
  weeklyChallenges: WeeklyChallenge[];
}) {
  const windows = PLAN_WINDOWS.filter((w) => selection.has(w.id));
  const today = new Date().toLocaleDateString("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className="hidden bg-white p-8 text-black print:block"
      data-action-plan-print="true"
    >
      <header className="mb-6 border-b border-gray-300 pb-3">
        <h1 className="text-3xl font-semibold">Action Plan</h1>
        <p className="mt-1 text-sm text-gray-600">Generated {today}</p>
      </header>

      {windows.length === 0 ? (
        <p className="text-sm text-gray-600">No windows selected.</p>
      ) : (
        windows.map((w) => {
          const windowGoals = goals.filter((g) => goalToWindow(g) === w.id);
          const windowChallenges =
            w.id === "weekly"
              ? weeklyChallenges.filter((c) => c.status === "active")
              : [];
          const autoSec = autoPopSection(w.id);

          return (
            <section className="mb-8 break-inside-avoid" key={w.id}>
              <h2 className="text-2xl font-semibold">{w.label}</h2>
              <p className="mt-1 mb-4 text-sm text-gray-600">{w.description}</p>

              {SECTIONS_BY_WINDOW[w.id].map((sectionId) => {
                const sec = SECTION_DEFS[sectionId];
                const items = store[w.id][sectionId];
                const showAuto = sectionId === autoSec;
                const autoGoals = showAuto ? windowGoals : [];
                const autoChallenges = showAuto ? windowChallenges : [];
                const empty =
                  items.length === 0 &&
                  autoGoals.length === 0 &&
                  autoChallenges.length === 0;

                return (
                  <div className="mb-5 break-inside-avoid" key={sectionId}>
                    <h3
                      className="mb-2 border-b border-gray-200 pb-1 text-base font-semibold"
                      style={{ color: sec.color }}
                    >
                      {sec.label}
                    </h3>

                    {empty ? (
                      <p className="text-xs italic text-gray-500">
                        Nothing here yet.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {autoGoals.map((g) => (
                          <li className="text-sm text-gray-900" key={g.id}>
                            <span
                              className={
                                g.status === "completed"
                                  ? "text-gray-500 line-through"
                                  : ""
                              }
                            >
                              {g.title}
                            </span>
                            {g.target_date ? (
                              <span className="ml-2 text-xs text-gray-500">
                                (Due{" "}
                                {new Date(g.target_date).toLocaleDateString(
                                  "en",
                                  { month: "short", day: "numeric" },
                                )}
                                )
                              </span>
                            ) : null}
                            <span className="ml-2 text-[0.65rem] uppercase tracking-wider text-gray-500">
                              [Goal]
                            </span>
                          </li>
                        ))}
                        {autoChallenges.map((c) => (
                          <li className="text-sm text-gray-900" key={c.id}>
                            {c.title}
                            {c.category ? (
                              <span className="ml-2 text-xs text-gray-500">
                                ({c.category})
                              </span>
                            ) : null}
                            <span className="ml-2 text-[0.65rem] uppercase tracking-wider text-gray-500">
                              [Challenge]
                            </span>
                          </li>
                        ))}
                        {items.map((item) => (
                          <li className="text-sm text-gray-900" key={item.id}>
                            <span
                              className={[
                                item.done ? "text-gray-500 line-through" : "",
                                item.bold ? "font-semibold" : "",
                              ].join(" ")}
                            >
                              {item.done ? "☑ " : "☐ "}
                              {item.text}
                            </span>
                            {item.notes && item.notes.length > 0 ? (
                              <ul className="ml-6 mt-1 list-disc">
                                {item.notes.map((n, i) => (
                                  <li
                                    className="text-xs text-gray-700"
                                    key={i}
                                  >
                                    {n}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </section>
          );
        })
      )}
    </div>
  );
}

// ── PlanColumn ──────────────────────────────────────────────────────────────

function PlanColumn({
  challenges,
  goals,
  items,
  onAdd,
  onDelete,
  onEdit,
  onToggle,
  section,
}: {
  challenges: WeeklyChallenge[];
  goals: Goal[];
  items: ManualItem[];
  onAdd: (text: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, update: Partial<ManualItem>) => void;
  onToggle: (id: string) => void;
  section: SectionDef;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    if (!draft.trim()) return;
    onAdd(draft);
    setDraft("");
  }

  const isEmpty = goals.length === 0 && challenges.length === 0 && items.length === 0;

  return (
    <div className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-5">
      {/* Section header */}
      <div className="mb-4 flex items-center gap-2">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: section.color }}
        />
        <h3 className="font-serif text-xl leading-tight text-[color:var(--almanac-ink)]">
          {section.label}
        </h3>
      </div>

      <div className="grid gap-2">
        {/* Goals from activities / awards */}
        {goals.map((g) => (
          <div
            className={[
              "flex items-start gap-2.5 rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] px-3 py-2.5",
              g.status === "completed" ? "opacity-50" : "",
            ].join(" ")}
            key={g.id}
          >
            <span
              className={[
                "mt-0.5 size-3.5 shrink-0 rounded-full border-2",
                g.status === "completed"
                  ? "border-[color:var(--almanac-sage)] bg-[color:var(--almanac-sage)]"
                  : "border-[color:var(--almanac-sage)]",
              ].join(" ")}
            />
            <div className="min-w-0 flex-1">
              <p
                className={[
                  "text-[0.83rem] leading-snug text-[color:var(--almanac-ink)]",
                  g.status === "completed" ? "line-through" : "",
                ].join(" ")}
              >
                {g.title}
              </p>
              {g.target_date ? (
                <p className="mt-0.5 text-[0.7rem] text-[color:var(--almanac-ink-soft)]">
                  Due{" "}
                  {new Date(g.target_date).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              ) : null}
            </div>
            <span
              className="shrink-0 self-start rounded-full px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em]"
              style={{ backgroundColor: `${section.color}1A`, color: section.color }}
            >
              Goal
            </span>
          </div>
        ))}

        {/* Active weekly challenges */}
        {challenges.map((c) => (
          <div
            className="flex items-start gap-2.5 rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] px-3 py-2.5"
            key={c.id}
          >
            <span className="mt-0.5 size-3.5 shrink-0 rounded-full border-2 border-[color:var(--almanac-butter)]" />
            <div className="min-w-0 flex-1">
              <p className="text-[0.83rem] leading-snug text-[color:var(--almanac-ink)]">
                {c.title}
              </p>
              {c.category ? (
                <p className="mt-0.5 text-[0.7rem] text-[color:var(--almanac-ink-soft)]">
                  {c.category}
                </p>
              ) : null}
            </div>
            <span
              className="shrink-0 self-start rounded-full px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em]"
              style={{ backgroundColor: "#E0B26B1A", color: "#E0B26B" }}
            >
              Challenge
            </span>
          </div>
        ))}

        {/* User-added items */}
        {items.map((item) => (
          <PlanItemRow
            item={item}
            key={item.id}
            onDelete={() => onDelete(item.id)}
            onEdit={(update) => onEdit(item.id, update)}
            onToggle={() => onToggle(item.id)}
          />
        ))}

        {isEmpty ? (
          <p className="py-1 text-[0.8rem] italic text-[color:var(--almanac-ink-soft)]">
            Nothing here yet.
          </p>
        ) : null}
      </div>

      {/* Add input */}
      <div className="mt-4 flex gap-2">
        <input
          className="h-9 flex-1 rounded-lg border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] px-3 text-[0.83rem] text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[color:var(--almanac-olive)]"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
          placeholder="Add item…"
          type="text"
          value={draft}
        />
        <button
          className="h-9 shrink-0 rounded-lg bg-[color:var(--almanac-ink)] px-3 text-[0.75rem] font-medium text-[color:var(--almanac-paper)] transition disabled:opacity-40"
          disabled={!draft.trim()}
          onClick={commit}
          type="button"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ── PlanItemRow ─────────────────────────────────────────────────────────────

function PlanItemRow({
  item,
  onDelete,
  onEdit,
  onToggle,
}: {
  item: ManualItem;
  onDelete: () => void;
  onEdit: (update: Partial<ManualItem>) => void;
  onToggle: () => void;
}) {
  const [editingText, setEditingText] = useState(false);
  const [textDraft, setTextDraft] = useState(item.text);
  const [addingNote, setAddingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const textInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setTextDraft(item.text);
    setEditingText(true);
    setTimeout(() => textInputRef.current?.focus(), 0);
  }

  function commitText() {
    const trimmed = textDraft.trim();
    if (trimmed) onEdit({ text: trimmed });
    else setTextDraft(item.text);
    setEditingText(false);
  }

  function commitNote() {
    const trimmed = noteDraft.trim();
    if (trimmed) onEdit({ notes: [...(item.notes || []), trimmed] });
    setNoteDraft("");
    setAddingNote(false);
  }

  function deleteNote(idx: number) {
    onEdit({ notes: (item.notes || []).filter((_, i) => i !== idx) });
  }

  function startAddNote() {
    setAddingNote(true);
    setTimeout(() => noteInputRef.current?.focus(), 0);
  }

  const hasNotes = (item.notes || []).length > 0;

  return (
    <div className="rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] px-3 py-2.5">
      {/* Main row */}
      <div className="group flex items-center gap-2">
        {/* Checkbox */}
        <button
          aria-label={item.done ? "Mark not done" : "Mark done"}
          className={[
            "flex size-4 shrink-0 items-center justify-center rounded border-2 transition",
            item.done
              ? "border-[color:var(--almanac-olive)] bg-[color:var(--almanac-olive)]"
              : "border-[color:var(--almanac-rule)] hover:border-[color:var(--almanac-olive)]",
          ].join(" ")}
          onClick={onToggle}
          type="button"
        >
          {item.done ? (
            <svg
              className="text-[color:var(--almanac-paper)]"
              fill="none"
              height="8"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 10 10"
              width="8"
            >
              <polyline points="1.5,5 4,7.5 8.5,2.5" />
            </svg>
          ) : null}
        </button>

        {/* Text or edit input */}
        {editingText ? (
          <input
            ref={textInputRef}
            className="flex-1 rounded border border-[color:var(--almanac-olive)] bg-[color:var(--almanac-paper)] px-2 py-0.5 text-[0.83rem] text-[color:var(--almanac-ink)] outline-none"
            onBlur={commitText}
            onChange={(e) => setTextDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitText();
              if (e.key === "Escape") { setEditingText(false); setTextDraft(item.text); }
            }}
            value={textDraft}
          />
        ) : (
          <span
            className={[
              "flex-1 cursor-text text-[0.83rem] leading-snug",
              item.done ? "text-[color:var(--almanac-ink-soft)] line-through" : "text-[color:var(--almanac-ink)]",
              item.bold ? "font-semibold" : "",
            ].join(" ")}
            onClick={startEdit}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") startEdit(); }}
            role="button"
            tabIndex={0}
            title="Click to edit"
          >
            {item.text}
          </span>
        )}

        {/* Hover actions: Bold · Add note · Delete */}
        <div className="ml-1 flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
          <button
            aria-label={item.bold ? "Remove bold" : "Bold"}
            className={[
              "flex size-6 items-center justify-center rounded text-[0.72rem] font-bold transition",
              item.bold
                ? "bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]"
                : "text-[color:var(--almanac-ink-soft)] hover:text-[color:var(--almanac-ink)]",
            ].join(" ")}
            onClick={() => onEdit({ bold: !item.bold })}
            type="button"
          >
            B
          </button>
          <button
            aria-label="Add note"
            className="flex size-6 items-center justify-center rounded text-[color:var(--almanac-ink-soft)] transition hover:text-[color:var(--almanac-ink)]"
            onClick={startAddNote}
            title="Add note"
            type="button"
          >
            <svg fill="none" height="11" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 12 12" width="11">
              <line x1="6" x2="6" y1="1" y2="11" />
              <line x1="1" x2="11" y1="6" y2="6" />
            </svg>
          </button>
          <button
            aria-label="Delete item"
            className="flex size-6 items-center justify-center rounded text-[color:var(--almanac-ink-soft)] transition hover:text-[color:var(--almanac-ink)]"
            onClick={onDelete}
            type="button"
          >
            <svg fill="none" height="10" stroke="currentColor" strokeWidth="2" viewBox="0 0 10 10" width="10">
              <line x1="1.5" x2="8.5" y1="1.5" y2="8.5" />
              <line x1="8.5" x2="1.5" y1="1.5" y2="8.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Notes */}
      {(hasNotes || addingNote) ? (
        <div className="ml-6 mt-2 grid gap-1.5">
          {(item.notes || []).map((note, idx) => (
            <div className="group/note flex items-start gap-1.5" key={idx}>
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[color:var(--almanac-ink-soft)]" />
              <span className="flex-1 text-[0.78rem] leading-snug text-[color:var(--almanac-ink-soft)]">
                {note}
              </span>
              <button
                aria-label="Delete note"
                className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded text-[color:var(--almanac-ink-soft)] opacity-0 transition group-hover/note:opacity-60 hover:opacity-100"
                onClick={() => deleteNote(idx)}
                type="button"
              >
                <svg fill="none" height="8" stroke="currentColor" strokeWidth="2" viewBox="0 0 8 8" width="8">
                  <line x1="1" x2="7" y1="1" y2="7" />
                  <line x1="7" x2="1" y1="1" y2="7" />
                </svg>
              </button>
            </div>
          ))}

          {addingNote ? (
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 shrink-0 rounded-full bg-[color:var(--almanac-ink-soft)]" />
              <input
                ref={noteInputRef}
                className="h-7 flex-1 rounded border border-[color:var(--almanac-olive)] bg-[color:var(--almanac-paper)] px-2 text-[0.78rem] text-[color:var(--almanac-ink)] outline-none"
                onBlur={commitNote}
                onChange={(e) => setNoteDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); commitNote(); }
                  if (e.key === "Escape") { setAddingNote(false); setNoteDraft(""); }
                }}
                placeholder="Note… (Enter to save)"
                value={noteDraft}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function TimelineView({
  activities,
  awards,
  notes,
  goals,
  ownerName,
  weeklyChallenges,
}: {
  activities: Activity[];
  awards: Award[];
  notes: Note[];
  goals: Goal[];
  ownerName: string;
  weeklyChallenges: WeeklyChallenge[];
}) {
  return (
    <Scrollable>
      <PageHeader
        eyebrow="grades 9 → 12"
        description="Everything you add — activities, awards, and achievements on the left; notes, brainstorms, and weekly challenges on the right — lands here automatically, organized by date. Scroll to see your full history, filter by date range, or export a timeframe as a PDF."
        title={
          <>
            Your{" "}
            <em className="font-serif italic text-[color:var(--almanac-sage)]">
              timeline
            </em>
          </>
        }
      />
      <TimelineBoard
        activities={activities}
        awards={awards}
        notes={notes}
        goals={goals}
        ownerName={ownerName}
        weeklyChallenges={weeklyChallenges}
      />
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
  setStudentProfile,
  setPrefsOpen,
  setTab,
  studentProfile,
  tab,
  appearance,
  setAppearance,
  fontFamily,
  setFontFamily,
}: {
  customName: string;
  navLayout: "left" | "top";
  prefsOpen: boolean;
  setCustomName: (v: string) => void | Promise<void>;
  setNavLayout: (v: "left" | "top") => void | Promise<void>;
  setStudentProfile: (
    value: Parameters<typeof updateStudentAdmissionsProfile>[0],
  ) => void | Promise<void>;
  setPrefsOpen: (fn: (v: boolean) => boolean) => void;
  setTab: (tab: Tab) => void;
  studentProfile: StudentAdmissionsProfile | null;
  tab: Tab;
  appearance: "paper" | "dark";
  setAppearance: (v: "paper" | "dark") => void | Promise<void>;
  fontFamily: "serif" | "sans";
  setFontFamily: (v: "serif" | "sans") => void | Promise<void>;
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
              appearance={appearance}
              customName={customName}
              direction="down"
              fontFamily={fontFamily}
              navLayout={navLayout}
              open={prefsOpen}
              setAppearance={setAppearance}
              setCustomName={setCustomName}
              setFontFamily={setFontFamily}
              setNavLayout={setNavLayout}
              setStudentProfile={setStudentProfile}
              studentProfile={studentProfile}
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
  description,
  eyebrow,
  title,
}: {
  action?: React.ReactNode;
  description?: string;
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
        {description ? (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
            {description}
          </p>
        ) : null}
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
