"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Mic,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  commitImportedActivities,
  createActivity,
  createLinkedGoal,
  createNoteForActivity,
  deleteActivity,
  getResumeProfile,
  parseActivitiesFromText,
  reorderActivities,
  tagNoteToActivity,
  updateActivity,
  type ExtractedActivity,
  type ExtractedAward,
} from "@/app/dashboard/actions";
import {
  ActivityVoiceCoach,
  type VoiceFieldUpdate,
} from "@/components/activity-voice-coach";
import { LinkedGoals } from "@/components/linked-goals";
import { AssociatedWorkSection } from "@/components/associated-work-section";
import { toast } from "@/components/toast";
import { exportAsDocx, exportAsPdf } from "@/lib/export-doc";
import { buildActivityRecordText, collectAssociatedWork } from "@/lib/associated-record";
import {
  PendingGoalsEditor,
  mergeVoiceGoals,
  normalizeGoalMonth,
  type PendingGoal,
} from "@/components/pending-goals-editor";
import type {
  Activity,
  Award,
  Goal,
  GuidedSession,
  Note,
  ResumeEducation,
  ResumeProfile,
} from "@/lib/types";

const CATEGORIES = [
  "Academic",
  "Art",
  "Athletic - Club",
  "Athletic - JV/Varsity",
  "Career-Oriented",
  "Community Service (Volunteer)",
  "Computer/Technology",
  "Cultural",
  "Dance",
  "Debate/Speech",
  "Environmental",
  "Family Responsibilities",
  "Foreign Exchange",
  "Internship",
  "Journalism/Publication",
  "LGBT",
  "Music: Instrumental",
  "Music: Vocal",
  "Religious",
  "Research",
  "Robotics",
  "School Spirit",
  "Science/Math",
  "Social Justice",
  "Speech & Debate",
  "Student Govt./Politics",
  "Theater/Drama",
  "Work (Paid)",
  "Other Club/Activity",
];

const GRADE_OPTIONS = ["9", "10", "11", "12", "Post-Graduate", "N/A"];
const DEFAULT_TAGS = [
  "STEM",
  "Humanities",
  "Academic",
  "Service",
  "Creativity",
  "Leadership",
  "Passion Project",
];

type ActivityDraft = {
  id: string | null;
  name: string;
  category: string;
  position: string;
  description: string;
  organization_description: string;
  grades: string[];
  start_date: string;
  end_date: string;
  in_progress: boolean;
  hours_per_week: number;
  weeks_per_year: number;
  tags: string[];
};

// Visual-only example goals shown alongside the sample activities so students
// see what the Goals & Targets section looks like before they add their own.
// These are never written to the database.
const SAMPLE_ACTIVITY_GOALS: Goal[][] = [
  [
    {
      id: "sample-goal-1a",
      title: "Win 1st place at the State Speech Championship",
      status: "active",
      target_date: "2026-05-01",
      activity_id: null,
      award_id: null,
      created_at: new Date().toISOString(),
    },
    {
      id: "sample-goal-1b",
      title: "Mentor 3 new team members through their first tournament",
      status: "achieved",
      target_date: "2025-12-01",
      activity_id: null,
      award_id: null,
      created_at: new Date().toISOString(),
    },
  ],
  [
    {
      id: "sample-goal-2a",
      title: "Launch a youth-led food rescue program",
      status: "active",
      target_date: "2026-08-01",
      activity_id: null,
      award_id: null,
      created_at: new Date().toISOString(),
    },
  ],
];

const SAMPLE_DRAFTS: Array<Omit<ActivityDraft, "id">> = [
  {
    name: "Lincoln High School Speech & Debate",
    category: "Speech & Debate",
    position: "Captain",
    description:
      "Competed in Lincoln-Douglas and Policy debate formats at regional and state levels. Led weekly practice sessions and mentored newer members. Organized tournament travel logistics and coached JV teammates on argumentation and research skills.",
    organization_description:
      "Student-run team competing in 8+ regional and state tournaments per year. Open to all grades; ~25 members across novice, JV, and varsity divisions. Affiliated with the National Speech & Debate Association.",
    grades: ["10", "11", "12"],
    start_date: "2022-09",
    end_date: "",
    in_progress: true,
    hours_per_week: 8,
    weeks_per_year: 36,
    tags: ["Academic", "Leadership", "Public Speaking", "Critical Thinking"],
  },
  {
    name: "Local Food Bank",
    category: "Community Service (Volunteer)",
    position: "Volunteer Coordinator",
    description:
      "Coordinated weekend distribution shifts for 20+ volunteers serving 300+ families weekly. Built a scheduling system that reduced no-shows by 40%. Helped run two community food drives that collected over 5,000 lbs of donations.",
    organization_description:
      "Regional nonprofit serving 8,000+ food-insecure households across three counties. Operates a central warehouse plus eight neighborhood pantries; relies on ~400 volunteers monthly.",
    grades: ["11", "12"],
    start_date: "2023-06",
    end_date: "",
    in_progress: true,
    hours_per_week: 6,
    weeks_per_year: 48,
    tags: ["Service", "Leadership", "Community Impact"],
  },
];

function toDraft(activity: Activity): ActivityDraft {
  return {
    id: activity.id,
    name: activity.name,
    category: activity.category ?? "",
    position: activity.position ?? activity.role ?? "",
    description: activity.description ?? activity.impact ?? "",
    organization_description: activity.organization_description ?? "",
    grades: activity.grades ?? [],
    start_date: activity.start_date ?? "",
    end_date: activity.end_date ?? "",
    in_progress: activity.in_progress ?? false,
    hours_per_week: activity.hours_per_week ?? 0,
    weeks_per_year: activity.weeks_per_year ?? 0,
    tags: activity.tags ?? [],
  };
}

/** Build a (partial) Activity from the editor draft so the export formatters,
 *  which read Activity, can run on unsaved edits. */
function draftToActivity(d: ActivityDraft): Activity {
  return {
    id: d.id ?? "draft",
    name: d.name,
    role: d.position || null,
    impact: d.description || null,
    years: null,
    category: d.category || null,
    position: d.position || null,
    description: d.description || null,
    organization_description: d.organization_description || null,
    grades: d.grades,
    start_date: d.start_date || null,
    end_date: d.end_date || null,
    in_progress: d.in_progress,
    hours_per_week: d.hours_per_week,
    weeks_per_year: d.weeks_per_year,
    tags: d.tags,
    sort_order: 0,
    created_at: new Date().toISOString(),
  };
}

function emptyDraft(): ActivityDraft {
  return {
    id: null,
    name: "",
    category: "",
    position: "",
    description: "",
    organization_description: "",
    grades: [],
    start_date: "",
    end_date: "",
    in_progress: false,
    hours_per_week: 0,
    weeks_per_year: 0,
    tags: [],
  };
}

export function ActivitiesTab({
  activities,
  awards,
  notes,
  goals,
  guidedSessions = [],
}: {
  activities: Activity[];
  awards?: Award[];
  notes: Note[];
  goals: Goal[];
  guidedSessions?: GuidedSession[];
}) {
  const [editing, setEditing] = useState<{ draft: ActivityDraft; voiceFirst: boolean } | null>(null);
  const [importing, setImporting] = useState(false);
  const [bulkExporting, setBulkExporting] = useState(false);
  const [, startTransition] = useTransition();

  const handleDelete = useCallback((id: string) => {
    if (!confirm("Delete this activity? This cannot be undone.")) return;
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      await deleteActivity(fd);
      toast.success("Activity deleted.");
    });
  }, []);

  const handleReorder = useCallback(
    (index: number, direction: -1 | 1) => {
      const target = index + direction;
      if (target < 0 || target >= activities.length) return;
      const reordered = [...activities];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      const fd = new FormData();
      fd.set("order", JSON.stringify(reordered.map((a) => a.id)));
      startTransition(() => {
        void reorderActivities(fd);
      });
    },
    [activities],
  );

  const isEmpty = activities.length === 0;

  // Synthesize sample Activities for display only — they have synthetic ids
  // and never write to the database. They disappear the moment the student
  // adds their own first activity.
  const sampleActivities: Activity[] = useMemo(
    () =>
      SAMPLE_DRAFTS.map((s, i) => ({
        id: `sample-${i}`,
        name: s.name,
        role: s.position,
        impact: s.description,
        years: null,
        category: s.category,
        position: s.position,
        description: s.description,
        organization_description: s.organization_description,
        grades: s.grades,
        start_date: s.start_date,
        end_date: s.end_date,
        in_progress: s.in_progress,
        hours_per_week: s.hours_per_week,
        weeks_per_year: s.weeks_per_year,
        tags: s.tags,
        sort_order: i,
        created_at: new Date().toISOString(),
      })),
    [],
  );

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-[color:var(--almanac-ink-soft)]">
            Activities
          </p>
          <h2 className="mt-2 font-serif text-3xl leading-tight text-[color:var(--almanac-ink)] md:text-4xl">
            Your activities & experiences
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
            Build a complete record once — leadership, service, work, art, athletics, research, family responsibilities. Then export it as a Common App entry, UC entry, or resume line.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activities.length > 0 && (
            <button
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--almanac-rule)] bg-white/60 px-4 py-2.5 text-sm font-medium text-[color:var(--almanac-ink)] transition hover:bg-white"
              onClick={() => setBulkExporting(true)}
              type="button"
            >
              <FileText size={14} />
              Export
            </button>
          )}
          <button
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--almanac-rule)] bg-white/60 px-4 py-2.5 text-sm font-medium text-[color:var(--almanac-ink)] transition hover:bg-white"
            onClick={() => setImporting(true)}
            type="button"
          >
            <Upload size={14} />
            Import resume
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--almanac-rule)] bg-white/60 px-4 py-2.5 text-sm font-medium text-[color:var(--almanac-ink)] transition hover:bg-white"
            onClick={() => setEditing({ draft: emptyDraft(), voiceFirst: false })}
            type="button"
          >
            <Plus size={14} />
            Add activity
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--almanac-ink)] px-5 py-2.5 text-sm font-medium text-[color:var(--almanac-paper)] transition hover:opacity-90"
            onClick={() => setEditing({ draft: emptyDraft(), voiceFirst: true })}
            type="button"
          >
            <Mic size={15} />
            Voice add activity
          </button>
        </div>
      </header>

      {isEmpty ? (
        <section>
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-dashed border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] px-4 py-2.5 text-xs text-[color:var(--almanac-ink-soft)]">
            <Sparkles size={13} />
            <span>
              <strong className="text-[color:var(--almanac-ink)]">These are samples</strong> showing what a strong entry looks like. They'll disappear once you add your own.
            </span>
          </div>
          <div className="grid gap-3">
            {sampleActivities.map((a, i) => (
              <ActivityCard
                key={a.id}
                activity={a}
                notes={[]}
                goals={SAMPLE_ACTIVITY_GOALS[i] ?? []}
                onEdit={() => setEditing({ draft: { ...toDraft(a), id: null }, voiceFirst: false })}
                onDelete={() => {}}
                allNotes={[]}
                isSample
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="grid gap-3">
          {activities.map((a, idx) => (
            <ActivityCard
              key={a.id}
              activity={a}
              rank={idx + 1}
              notes={notes.filter((n) => n.activity_id === a.id)}
              goals={goals.filter((g) => g.activity_id === a.id)}
              onEdit={() => setEditing({ draft: toDraft(a), voiceFirst: false })}
              onDelete={() => handleDelete(a.id)}
              allNotes={notes}
              onMoveUp={idx > 0 ? () => handleReorder(idx, -1) : undefined}
              onMoveDown={idx < activities.length - 1 ? () => handleReorder(idx, 1) : undefined}
            />
          ))}
        </div>
      )}

      {editing && (
        <ActivityEditor
          draft={editing.draft}
          voiceFirst={editing.voiceFirst}
          existingGoals={
            editing.draft.id
              ? goals.filter((g) => g.activity_id === editing.draft.id)
              : []
          }
          notes={notes}
          sessions={guidedSessions}
          onCancel={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}

      {bulkExporting && (
        <BulkExportModal
          activities={activities}
          awards={awards ?? []}
          onClose={() => setBulkExporting(false)}
        />
      )}

      {importing && (
        <ResumeImportModal
          existingActivities={activities.map((a) => ({ id: a.id, name: a.name }))}
          existingAwards={(awards ?? []).map((a) => ({ id: a.id, name: a.name }))}
          onClose={() => setImporting(false)}
        />
      )}
    </div>
  );
}

function ActivityCard({
  activity,
  notes,
  goals,
  onEdit,
  onDelete,
  allNotes,
  isSample = false,
  onMoveUp,
  onMoveDown,
  rank,
}: {
  activity: Activity;
  notes: Note[];
  goals: Goal[];
  onEdit: () => void;
  onDelete: () => void;
  allNotes: Note[];
  isSample?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  rank?: number;
}) {
  const [showTagging, setShowTagging] = useState(false);
  const start = activity.start_date ?? "";
  const end = activity.in_progress ? "Present" : activity.end_date ?? "";
  const dateRange = start || end ? `${start || "—"} → ${end || "—"}` : null;
  const time =
    activity.hours_per_week || activity.weeks_per_year
      ? `${activity.hours_per_week}h/wk · ${activity.weeks_per_year}wks/yr`
      : null;

  return (
    <article
      className={[
        "flex gap-4 rounded-2xl border p-5 transition",
        isSample
          ? "border-dashed border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)]/60"
          : "border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(31,36,51,0.08)]",
      ].join(" ")}
    >
      {rank !== undefined && (onMoveUp || onMoveDown) && (
        <RankPillar rank={rank} onMoveUp={onMoveUp} onMoveDown={onMoveDown} />
      )}

      <div className="min-w-0 flex-1">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif text-2xl leading-tight text-[color:var(--almanac-ink)]">
              {activity.name || "Untitled activity"}
            </h3>
            {isSample && (
              <span className="inline-flex items-center rounded-full bg-[#efc97a]/30 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-[color:var(--almanac-ink)]">
                Sample
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[color:var(--almanac-ink-soft)]">
            {[activity.position, activity.category].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            className="rounded-full p-2 text-[color:var(--almanac-ink-soft)] transition hover:bg-black/5 hover:text-[color:var(--almanac-ink)]"
            onClick={onEdit}
            title={isSample ? "Use as template" : "Edit"}
            type="button"
          >
            <Pencil size={14} />
          </button>
          {!isSample && (
            <button
              className="rounded-full p-2 text-[color:var(--almanac-ink-soft)] transition hover:bg-red-500/10 hover:text-red-600"
              onClick={onDelete}
              title="Delete"
              type="button"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </header>

      {activity.organization_description && (
        <p className="mt-3 rounded-lg border border-[color:var(--almanac-rule)] bg-white/40 px-3 py-2 text-xs italic leading-5 text-[color:var(--almanac-ink-soft)]">
          <span className="font-semibold uppercase not-italic tracking-[0.12em]">About:</span>{" "}
          {activity.organization_description}
        </p>
      )}

      {(activity.description ?? activity.impact) && (
        <p className="mt-3 text-sm leading-6 text-[color:var(--almanac-ink)]/80">
          {activity.description ?? activity.impact}
        </p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
        {dateRange && <Detail label="Dates">{dateRange}</Detail>}
        {activity.grades.length > 0 && (
          <Detail label="Grades">{activity.grades.join(", ")}</Detail>
        )}
        {time && <Detail label="Time">{time}</Detail>}
      </dl>

      {activity.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {activity.tags.map((tag) => (
            <span
              className="inline-flex items-center rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium text-[color:var(--almanac-ink)]"
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <LinkedGoals
        parentId={activity.id}
        parentKind="activity"
        goals={goals}
        readonly={isSample}
      />

      {!isSample && (
        <TaggedPosts
          activityId={activity.id}
          notes={notes}
          allNotes={allNotes}
          show={showTagging}
          onToggle={() => setShowTagging(!showTagging)}
        />
      )}

      {!isSample && activity.id && (
        <p className="mt-4 border-t border-[color:var(--almanac-rule)] pt-3 text-sm text-[color:var(--almanac-ink-soft)]">
          Need help fleshing out the details or making this more in-depth?{" "}
          <button
            className="font-medium text-[color:var(--almanac-olive)] underline-offset-2 transition hover:underline"
            onClick={() => startDeepenSession(activity.id)}
            type="button"
          >
            Deepen this activity →
          </button>
        </p>
      )}
      </div>
    </article>
  );
}

/**
 * Hand off to the Guided Session "Deepen Current Activity" flow with this
 * activity pre-selected. We stash the id in sessionStorage and ask the
 * workspace (via a window event) to switch to the Sessions tab. This avoids
 * threading a callback through Workspace → DashboardView → ActivitiesTab →
 * ActivityCard.
 */
function startDeepenSession(activityId: string) {
  try {
    sessionStorage.setItem("cultvr-deepen-activity-id", activityId);
  } catch {
    /* sessionStorage unavailable — session will just open without preselect */
  }
  window.dispatchEvent(
    new CustomEvent("cultvr:navigate-tab", { detail: { tab: "sessions" } }),
  );
}

function RankPillar({
  rank,
  onMoveUp,
  onMoveDown,
}: {
  rank: number;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1 pt-1">
      <button
        className="flex size-7 items-center justify-center rounded-full text-[color:var(--almanac-ink-soft)] transition hover:bg-black/5 hover:text-[color:var(--almanac-ink)] disabled:cursor-not-allowed disabled:opacity-20 disabled:hover:bg-transparent"
        disabled={!onMoveUp}
        onClick={onMoveUp}
        title="Move up"
        type="button"
      >
        <ArrowUp size={16} strokeWidth={2.4} />
      </button>
      <div className="flex size-9 items-center justify-center rounded-full border border-[color:var(--almanac-rule)] bg-white/60 font-mono text-xs font-semibold text-[color:var(--almanac-ink)]">
        #{rank}
      </div>
      <button
        className="flex size-7 items-center justify-center rounded-full text-[color:var(--almanac-ink-soft)] transition hover:bg-black/5 hover:text-[color:var(--almanac-ink)] disabled:cursor-not-allowed disabled:opacity-20 disabled:hover:bg-transparent"
        disabled={!onMoveDown}
        onClick={onMoveDown}
        title="Move down"
        type="button"
      >
        <ArrowDown size={16} strokeWidth={2.4} />
      </button>
    </div>
  );
}

function TaggedPosts({
  activityId,
  notes,
  allNotes,
  show,
  onToggle,
}: {
  activityId: string;
  notes: Note[];
  allNotes: Note[];
  show: boolean;
  onToggle: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [isPending, startTransition] = useTransition();

  const untagged = allNotes.filter((n) => n.activity_id !== activityId);

  const handleTagExisting = useCallback(
    (noteId: string) => {
      const fd = new FormData();
      fd.set("note_id", noteId);
      fd.set("activity_id", activityId);
      startTransition(() => {
        void tagNoteToActivity(fd);
      });
    },
    [activityId],
  );

  const handleUntag = useCallback((noteId: string) => {
    const fd = new FormData();
    fd.set("note_id", noteId);
    fd.set("activity_id", "");
    startTransition(() => {
      void tagNoteToActivity(fd);
    });
  }, []);

  const handleCreateNote = useCallback(() => {
    if (!newTitle.trim() || !newBody.trim()) return;
    const fd = new FormData();
    fd.set("title", newTitle.trim());
    fd.set("body", newBody.trim());
    fd.set("activity_id", activityId);
    startTransition(async () => {
      await createNoteForActivity(fd);
      setNewTitle("");
      setNewBody("");
      setAdding(false);
    });
  }, [activityId, newTitle, newBody]);

  return (
    <section className="mt-4 border-t border-[color:var(--almanac-rule)] pt-3">
      <button
        className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.18em] text-[color:var(--almanac-ink-soft)] transition hover:text-[color:var(--almanac-ink)]"
        onClick={onToggle}
        type="button"
      >
        Tagged Posts ({notes.length})
        <ChevronDown
          className={show ? "rotate-180 transition" : "transition"}
          size={12}
        />
      </button>

      {show && (
        <div className="mt-3 space-y-2">
          {notes.length === 0 ? (
            <p className="text-xs text-[color:var(--almanac-ink-soft)]">
              No tagged posts yet. Write a reflection about this activity to start building your story.
            </p>
          ) : (
            notes.map((note) => (
              <div
                className="flex items-start justify-between gap-2 rounded-lg border border-[color:var(--almanac-rule)] bg-white/40 px-3 py-2"
                key={note.id}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[color:var(--almanac-ink)]">{note.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-[color:var(--almanac-ink-soft)]">{note.body}</p>
                </div>
                <button
                  className="shrink-0 rounded-full p-1 text-[color:var(--almanac-ink-soft)] transition hover:bg-black/5 hover:text-[color:var(--almanac-ink)]"
                  onClick={() => handleUntag(note.id)}
                  title="Untag"
                  type="button"
                >
                  <X size={12} />
                </button>
              </div>
            ))
          )}

          {adding ? (
            <div className="space-y-2 rounded-lg border border-[color:var(--almanac-rule)] bg-white/60 p-3">
              <input
                className="w-full rounded-md border border-[color:var(--almanac-rule)] bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[#3F4A66]"
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Reflection title…"
                value={newTitle}
              />
              <textarea
                className="min-h-[4rem] w-full rounded-md border border-[color:var(--almanac-rule)] bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[#3F4A66]"
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="What happened? What did you learn?"
                value={newBody}
              />
              <div className="flex justify-end gap-2">
                <button
                  className="rounded-md px-3 py-1 text-xs text-[color:var(--almanac-ink-soft)] hover:text-[color:var(--almanac-ink)]"
                  onClick={() => setAdding(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-md bg-[color:var(--almanac-ink)] px-3 py-1 text-xs font-medium text-[color:var(--almanac-paper)] disabled:opacity-50"
                  disabled={isPending || !newTitle.trim() || !newBody.trim()}
                  onClick={handleCreateNote}
                  type="button"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex items-center gap-1 rounded-full border border-[color:var(--almanac-rule)] px-3 py-1.5 text-xs font-medium text-[color:var(--almanac-ink)] transition hover:bg-white/60"
                onClick={() => setAdding(true)}
                type="button"
              >
                <Plus size={11} />
                New post
              </button>
              {untagged.length > 0 && (
                <TagExistingPicker notes={untagged} onSelect={handleTagExisting} />
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function TagExistingPicker({
  notes,
  onSelect,
}: {
  notes: Note[];
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        className="inline-flex items-center gap-1 rounded-full border border-[color:var(--almanac-rule)] px-3 py-1.5 text-xs font-medium text-[color:var(--almanac-ink)] transition hover:bg-white/60"
        onClick={() => setOpen(!open)}
        type="button"
      >
        Tag existing post
        <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 max-h-60 w-72 overflow-y-auto rounded-lg border border-[color:var(--almanac-rule)] bg-white shadow-lg">
          {notes.map((n) => (
            <button
              className="block w-full px-3 py-2 text-left text-xs hover:bg-black/5"
              key={n.id}
              onClick={() => {
                onSelect(n.id);
                setOpen(false);
              }}
              type="button"
            >
              <p className="font-medium text-[color:var(--almanac-ink)]">{n.title}</p>
              <p className="line-clamp-1 text-[color:var(--almanac-ink-soft)]">{n.body}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[0.6rem] uppercase tracking-[0.15em] text-[color:var(--almanac-ink-soft)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-[color:var(--almanac-ink)]">{children}</dd>
    </div>
  );
}

function summarizeDraft(d: ActivityDraft): string {
  const parts: string[] = [];
  if (d.name) parts.push(`name="${d.name}"`);
  if (d.category) parts.push(`category="${d.category}"`);
  if (d.position) parts.push(`position="${d.position}"`);
  if (d.description) parts.push(`description has ${d.description.length} chars`);
  if (d.grades.length) parts.push(`grades=[${d.grades.join(",")}]`);
  if (d.start_date) parts.push(`start=${d.start_date}`);
  if (d.end_date || d.in_progress) parts.push(`end=${d.in_progress ? "ongoing" : d.end_date}`);
  if (d.hours_per_week) parts.push(`hours/wk=${d.hours_per_week}`);
  if (d.weeks_per_year) parts.push(`wks/yr=${d.weeks_per_year}`);
  if (d.tags.length) parts.push(`tags=[${d.tags.join(",")}]`);
  return parts.join("; ");
}

function draftToFormData(draft: ActivityDraft): FormData {
  const fd = new FormData();
  if (draft.id) fd.set("id", draft.id);
  fd.set("name", draft.name);
  fd.set("category", draft.category);
  fd.set("position", draft.position);
  fd.set("description", draft.description);
  fd.set("organization_description", draft.organization_description);
  fd.set("grades", JSON.stringify(draft.grades));
  fd.set("start_date", draft.start_date);
  fd.set("end_date", draft.end_date);
  fd.set("in_progress", draft.in_progress ? "true" : "false");
  fd.set("hours_per_week", String(draft.hours_per_week));
  fd.set("weeks_per_year", String(draft.weeks_per_year));
  fd.set("tags", JSON.stringify(draft.tags));
  return fd;
}

function ActivityEditor({
  draft: initial,
  onCancel,
  onSaved,
  voiceFirst = false,
  existingGoals = [],
  notes = [],
  sessions = [],
}: {
  draft: ActivityDraft;
  onCancel: () => void;
  onSaved: () => void;
  voiceFirst?: boolean;
  existingGoals?: Goal[];
  notes?: Note[];
  sessions?: GuidedSession[];
}) {
  const [draft, setDraft] = useState<ActivityDraft>(initial);
  const [newTag, setNewTag] = useState("");
  const [pendingGoals, setPendingGoals] = useState<PendingGoal[]>([]);
  const [isPending, startTransition] = useTransition();
  const [exportOpen, setExportOpen] = useState(false);
  const isNew = !draft.id;
  const charCount = draft.description.length;
  // Tracks goal titles already persisted live (existing-activity voice flow)
  // so the coach resending its full list doesn't insert duplicates.
  const savedVoiceGoalsRef = useRef<Set<string>>(new Set());

  const update = useCallback(
    <K extends keyof ActivityDraft>(key: K, value: ActivityDraft[K]) => {
      setDraft((d) => ({ ...d, [key]: value }));
    },
    [],
  );

  const toggleGrade = useCallback((grade: string) => {
    setDraft((d) => ({
      ...d,
      grades: d.grades.includes(grade)
        ? d.grades.filter((g) => g !== grade)
        : [...d.grades, grade],
    }));
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setDraft((d) => ({
      ...d,
      tags: d.tags.includes(tag) ? d.tags.filter((t) => t !== tag) : [...d.tags, tag],
    }));
  }, []);

  const addCustomTag = useCallback(() => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    setDraft((d) => (d.tags.includes(trimmed) ? d : { ...d, tags: [...d.tags, trimmed] }));
    setNewTag("");
  }, [newTag]);

  const allTags = useMemo(() => {
    const set = new Set<string>(DEFAULT_TAGS);
    draft.tags.forEach((t) => set.add(t));
    return Array.from(set);
  }, [draft.tags]);

  const handleSave = useCallback(() => {
    if (!draft.name.trim()) return;
    const fd = draftToFormData(draft);
    // Only relevant on create — server picks this up after inserting the activity.
    if (isNew && pendingGoals.length) {
      fd.set(
        "pending_goals",
        JSON.stringify(
          pendingGoals.map((g) => ({ title: g.title, target_date: g.target_date })),
        ),
      );
    }
    startTransition(async () => {
      if (draft.id) await updateActivity(fd);
      else await createActivity(fd);
      onSaved();
    });
  }, [draft, pendingGoals, isNew, onSaved]);

  const handleVoiceUpdate = useCallback((u: VoiceFieldUpdate) => {
    setDraft((d) => ({
      ...d,
      ...(u.name !== undefined ? { name: u.name } : null),
      ...(u.category !== undefined ? { category: u.category } : null),
      ...(u.position !== undefined ? { position: u.position } : null),
      ...(u.description !== undefined ? { description: u.description } : null),
      ...(u.organization_description !== undefined
        ? { organization_description: u.organization_description }
        : null),
      ...(u.grades !== undefined ? { grades: u.grades } : null),
      ...(u.start_date !== undefined ? { start_date: u.start_date } : null),
      ...(u.end_date !== undefined ? { end_date: u.end_date } : null),
      ...(u.in_progress !== undefined ? { in_progress: u.in_progress } : null),
      ...(u.hours_per_week !== undefined ? { hours_per_week: u.hours_per_week } : null),
      ...(u.weeks_per_year !== undefined ? { weeks_per_year: u.weeks_per_year } : null),
      ...(u.tags !== undefined ? { tags: u.tags } : null),
    }));

    // Goals the coach captured. For a NEW activity, stage them on the draft so
    // they save with the activity on create. For an EXISTING activity the
    // pending-goals editor isn't shown, so persist each new goal immediately.
    if (u.goals?.length) {
      if (initial.id) {
        for (const g of u.goals) {
          const title = g.title.trim();
          const key = title.toLowerCase();
          if (title.length < 2 || savedVoiceGoalsRef.current.has(key)) continue;
          savedVoiceGoalsRef.current.add(key);
          const fd = new FormData();
          fd.set("title", title);
          const target = normalizeGoalMonth(g.target_date);
          if (target) fd.set("target_date", target);
          fd.set("activity_id", initial.id);
          startTransition(() => {
            void createLinkedGoal(fd);
          });
        }
      } else {
        setPendingGoals((cur) => mergeVoiceGoals(cur, u.goals!));
      }
    }
  }, [initial.id]);

  const draftSummary = useMemo(() => summarizeDraft(draft), [draft]);

  // Brainstorm sessions + notes linked to this (already-saved) activity, and
  // the bundled "Full record" export text built from the entry, its goals, and
  // that associated work. Empty for a brand-new activity that has no id yet.
  const associated = useMemo(
    () =>
      initial.id
        ? collectAssociatedWork({
            kind: "activity",
            id: initial.id,
            notes,
            goals: existingGoals,
            sessions,
          })
        : { notes: [], sessions: [] },
    [initial.id, notes, existingGoals, sessions],
  );

  const fullRecordText = useMemo(
    () =>
      initial.id
        ? buildActivityRecordText(draftToActivity(draft), existingGoals, associated)
        : "",
    [initial.id, draft, existingGoals, associated],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[color:var(--almanac-rule)] px-6 py-4">
          <h3 className="font-serif text-2xl text-[color:var(--almanac-ink)]">
            {draft.id ? "Edit activity" : "New activity"}
          </h3>
          <button
            className="rounded-full p-1.5 text-[color:var(--almanac-ink-soft)] transition hover:bg-black/5"
            onClick={onCancel}
            type="button"
          >
            <X size={16} />
          </button>
        </header>

        <div className="grid gap-5 px-6 py-5">
          <ActivityVoiceCoach
            autoStart={voiceFirst}
            onUpdate={handleVoiceUpdate}
            currentDraftSummary={draftSummary}
          />

          <Field label="Organization/Activity Name">
            <TextInput
              value={draft.name}
              onChange={(v) => update("name", v)}
              placeholder="e.g., Lincoln High School Debate Team"
            />
          </Field>

          <Field label="Category">
            <SelectInput
              value={draft.category}
              onChange={(v) => update("category", v)}
              options={CATEGORIES}
            />
          </Field>

          <Field
            label="About the organization (optional)"
            hint={`${draft.organization_description.length} characters`}
          >
            <textarea
              className="min-h-[5rem] w-full rounded-xl border border-[color:var(--almanac-rule)] bg-white/60 px-3 py-2.5 text-sm leading-6 text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[#3F4A66] focus:bg-white"
              maxLength={2000}
              onChange={(e) => update("organization_description", e.target.value)}
              placeholder="What is this organization? How big is it, what does it do, what makes it notable? (Useful when admissions readers may not recognize the name.)"
              value={draft.organization_description}
            />
          </Field>

          <Field label="Position">
            <TextInput
              value={draft.position}
              onChange={(v) => update("position", v)}
              placeholder="e.g., Captain, Member, Founder"
            />
          </Field>

          <Field
            label="Describe this activity, including what it entails, accomplishments, recognitions, and what you've taken away."
            hint={`${charCount} characters`}
          >
            <textarea
              className="min-h-[7rem] w-full rounded-xl border border-[color:var(--almanac-rule)] bg-white/60 px-3 py-2.5 text-sm leading-6 text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[#3F4A66] focus:bg-white"
              maxLength={2000}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Briefly describe your role, key accomplishments, and impact..."
              value={draft.description}
            />
          </Field>

          <Field label="Participation Grades">
            <div className="flex flex-wrap gap-2">
              {GRADE_OPTIONS.map((grade) => {
                const active = draft.grades.includes(grade);
                return (
                  <button
                    className={[
                      "rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
                      active
                        ? "border-[color:var(--almanac-ink)] bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]"
                        : "border-[color:var(--almanac-rule)] bg-white/60 text-[color:var(--almanac-ink)] hover:border-[color:var(--almanac-ink-soft)]",
                    ].join(" ")}
                    key={grade}
                    onClick={() => toggleGrade(grade)}
                    type="button"
                  >
                    {grade}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start Date">
              <TextInput
                value={draft.start_date}
                onChange={(v) => update("start_date", v)}
                placeholder="YYYY-MM"
              />
            </Field>
            <Field label="End Date">
              <div className="space-y-2">
                <TextInput
                  value={draft.in_progress ? "" : draft.end_date}
                  onChange={(v) => update("end_date", v)}
                  placeholder="e.g., 2025-06"
                  disabled={draft.in_progress}
                />
                <label className="flex items-center gap-2 text-xs text-[color:var(--almanac-ink-soft)]">
                  <input
                    checked={draft.in_progress}
                    onChange={(e) => update("in_progress", e.target.checked)}
                    type="checkbox"
                  />
                  In Progress
                </label>
              </div>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Hours spent per week">
              <NumberInput
                value={draft.hours_per_week}
                onChange={(v) => update("hours_per_week", v)}
              />
            </Field>
            <Field label="Weeks spent per year">
              <NumberInput
                value={draft.weeks_per_year}
                onChange={(v) => update("weeks_per_year", v)}
              />
            </Field>
          </div>

          <Field label="Tags">
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((tag) => {
                const active = draft.tags.includes(tag);
                return (
                  <button
                    className={[
                      "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition",
                      active
                        ? "border-[color:var(--almanac-ink)] bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]"
                        : "border-[color:var(--almanac-rule)] bg-white/60 text-[color:var(--almanac-ink)] hover:border-[color:var(--almanac-ink-soft)]",
                    ].join(" ")}
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    type="button"
                  >
                    {tag}
                    {active && <X size={10} />}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex gap-2">
              <TextInput
                value={newTag}
                onChange={setNewTag}
                placeholder="Add custom tag..."
                onEnter={addCustomTag}
              />
              <button
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[color:var(--almanac-rule)] px-3 py-2 text-xs font-medium text-[color:var(--almanac-ink)] transition hover:bg-black/5"
                onClick={addCustomTag}
                type="button"
              >
                <Plus size={12} />
              </button>
            </div>
          </Field>

          {/* Goals section — short/long-term targets tied to this activity */}
          {isNew ? (
            <PendingGoalsEditor goals={pendingGoals} onChange={setPendingGoals} />
          ) : (
            <LinkedGoals
              parentId={draft.id!}
              parentKind="activity"
              goals={existingGoals}
            />
          )}

          {/* Brainstorm sessions & notes linked to this activity (existing only) */}
          {!isNew && (
            <AssociatedWorkSection
              parentId={draft.id!}
              parentKind="activity"
              notes={associated.notes}
              allNotes={notes}
              sessions={associated.sessions}
            />
          )}

          {/* Export this single activity — lives at the very bottom of the editor. */}
          {draft.name.trim() ? (
            <div className="border-t border-[color:var(--almanac-rule)] pt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-[color:var(--almanac-ink)]">
                    Export this activity
                  </p>
                  <p className="mt-0.5 text-[0.7rem] leading-4 text-[color:var(--almanac-ink-soft)]">
                    Copy it as a Common App, UC, or resume entry
                    {fullRecordText
                      ? ", or export the full record with goals, sessions & notes"
                      : ""}
                    .
                  </p>
                </div>
                <button
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[color:var(--almanac-rule)] px-4 py-2 text-xs font-medium text-[color:var(--almanac-ink)] transition hover:bg-black/5"
                  onClick={() => setExportOpen(true)}
                  type="button"
                >
                  <FileText size={13} />
                  Export
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {exportOpen ? (
          <ExportModal
            activity={draftToActivity(draft)}
            fullRecordText={fullRecordText}
            onClose={() => setExportOpen(false)}
          />
        ) : null}

        <footer className="flex items-center justify-end gap-2 border-t border-[color:var(--almanac-rule)] px-6 py-4">
          <button
            className="rounded-full border border-[color:var(--almanac-rule)] px-5 py-2 text-sm font-medium text-[color:var(--almanac-ink)] transition hover:bg-black/5"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-full bg-[color:var(--almanac-ink)] px-5 py-2 text-sm font-medium text-[color:var(--almanac-paper)] transition hover:opacity-90 disabled:opacity-50"
            disabled={isPending || !draft.name.trim()}
            onClick={handleSave}
            type="button"
          >
            {isPending ? "Saving…" : draft.id ? "Update activity" : "Save activity"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="flex items-baseline justify-between gap-3 text-xs font-medium text-[color:var(--almanac-ink)]">
        <span>{label}</span>
        {hint && <span className="text-[0.65rem] font-normal text-[color:var(--almanac-ink-soft)]">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onEnter?: () => void;
}) {
  return (
    <input
      className="w-full rounded-xl border border-[color:var(--almanac-rule)] bg-white/60 px-3 py-2.5 text-sm text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[#3F4A66] focus:bg-white disabled:opacity-50"
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && onEnter) {
          e.preventDefault();
          onEnter();
        }
      }}
      placeholder={placeholder}
      type="text"
      value={value}
    />
  );
}

function NumberInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      className="w-full rounded-xl border border-[color:var(--almanac-rule)] bg-white/60 px-3 py-2.5 text-sm text-[color:var(--almanac-ink)] outline-none focus:border-[#3F4A66] focus:bg-white"
      min={0}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      type="number"
      value={value || ""}
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="relative">
      <select
        className="w-full appearance-none rounded-xl border border-[color:var(--almanac-rule)] bg-white/60 px-3 py-2.5 pr-9 text-sm text-[color:var(--almanac-ink)] outline-none focus:border-[#3F4A66] focus:bg-white"
        onChange={(e) => onChange(e.target.value)}
        value={value}
      >
        <option value="">Select category…</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--almanac-ink-soft)]"
        size={16}
      />
    </div>
  );
}

// ============================================================================
// RESUME IMPORT MODAL
// ============================================================================

type ImportMode = "add" | "replace";
type ReviewActivity = ExtractedActivity & { _include: boolean; _mode: ImportMode };
type ReviewAward = ExtractedAward & { _include: boolean; _mode: ImportMode };

/** Loose name match for duplicate detection — case/space/punctuation-insensitive. */
function normalizeName(name: string | undefined): string {
  return (name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

type ExistingRef = { id: string; name: string };

function ResumeImportModal({
  existingActivities,
  existingAwards,
  onClose,
}: {
  existingActivities: ExistingRef[];
  existingAwards: ExistingRef[];
  onClose: () => void;
}) {
  // Map normalized name → existing row id, for duplicate detection + replace.
  const existingActivityMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of existingActivities) m.set(normalizeName(a.name), a.id);
    return m;
  }, [existingActivities]);
  const existingAwardMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of existingAwards) m.set(normalizeName(a.name), a.id);
    return m;
  }, [existingAwards]);
  const [step, setStep] = useState<"input" | "review">("input");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewItems, setReviewItems] = useState<ReviewActivity[]>([]);
  const [reviewAwards, setReviewAwards] = useState<ReviewAward[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleFile = useCallback(async (picked: File) => {
    if (!picked) return;
    setError(null);
    setFile(picked);
    if (
      picked.type === "text/plain" ||
      picked.name.endsWith(".txt") ||
      picked.name.endsWith(".md")
    ) {
      const content = await picked.text();
      setText(content);
    } else {
      setText("");
    }
  }, []);

  // Step 1: parse → move to review (no DB write yet).
  const handleParse = useCallback(() => {
    if (!text.trim() && !file) {
      setError("Paste resume text or upload a file first.");
      return;
    }
    setError(null);
    const fd = new FormData();
    if (text.trim()) fd.set("text", text);
    else if (file) fd.set("file", file);

    startTransition(async () => {
      const res = await parseActivitiesFromText(fd);
      if (res.ok) {
        setReviewItems(
          res.activities.map((a) => ({ ...a, _include: true, _mode: "add" as const })),
        );
        setReviewAwards(
          res.awards.map((a) => ({ ...a, _include: true, _mode: "add" as const })),
        );
        setStep("review");
      } else {
        setError(res.error);
      }
    });
  }, [text, file]);

  // Step 2: commit the included (and possibly edited) items. Items marked
  // "replace" carry the matched existing row id so the server overwrites it.
  const handleCommit = useCallback(() => {
    const chosenActivities = reviewItems
      .filter((a) => a._include && a.name?.trim())
      .map(({ _include, _mode, ...rest }) => ({
        ...rest,
        ...(_mode === "replace"
          ? { _replaceId: existingActivityMap.get(normalizeName(rest.name)) }
          : {}),
      }));
    const chosenAwards = reviewAwards
      .filter((a) => a._include && a.name?.trim())
      .map(({ _include, _mode, ...rest }) => ({
        ...rest,
        ...(_mode === "replace"
          ? { _replaceId: existingAwardMap.get(normalizeName(rest.name)) }
          : {}),
      }));
    if (!chosenActivities.length && !chosenAwards.length) {
      setError("Select at least one item to import.");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("activities", JSON.stringify(chosenActivities));
    fd.set("awards", JSON.stringify(chosenAwards));
    startTransition(async () => {
      const res = await commitImportedActivities(fd);
      if (res.ok) {
        const added = res.activityCount + res.awardCount;
        const parts: string[] = [];
        if (added) parts.push(`Added ${added} ${added === 1 ? "item" : "items"}`);
        if (res.replacedCount)
          parts.push(`replaced ${res.replacedCount} ${res.replacedCount === 1 ? "item" : "items"}`);
        toast.success(`${parts.join(", ") || "Import complete"}.`);
        onClose();
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }, [reviewItems, reviewAwards, existingActivityMap, existingAwardMap, onClose]);

  function updateItem(index: number, patch: Partial<ReviewActivity>) {
    setReviewItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  function updateAward(index: number, patch: Partial<ReviewAward>) {
    setReviewAwards((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  const includedCount =
    reviewItems.filter((a) => a._include).length +
    reviewAwards.filter((a) => a._include).length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[color:var(--almanac-rule)] px-6 py-4">
          <div>
            <h3 className="font-serif text-2xl text-[color:var(--almanac-ink)]">
              {step === "input" ? "Import from resume" : "Review activities"}
            </h3>
            <p className="text-xs text-[color:var(--almanac-ink-soft)]">
              {step === "input"
                ? "Paste your resume or activities list. We'll detect both activities and awards into structured entries you can review."
                : "Edit anything, then choose which to import. Nothing is saved until you click Import."}
            </p>
          </div>
          <button
            className="rounded-full p-1.5 text-[color:var(--almanac-ink-soft)] transition hover:bg-black/5"
            onClick={onClose}
            type="button"
          >
            <X size={16} />
          </button>
        </header>

        {step === "input" ? (
          <div className="grid gap-4 px-6 py-5">
            <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-full border border-[color:var(--almanac-rule)] bg-white/60 px-4 py-2 text-xs font-medium text-[color:var(--almanac-ink)] transition hover:bg-white">
              <Upload size={12} />
              Upload PDF, Word doc, or text file
              <input
                accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="sr-only"
                onChange={(e) => {
                  const picked = e.target.files?.[0];
                  if (picked) void handleFile(picked);
                  e.target.value = "";
                }}
                type="file"
              />
            </label>

            {file && !text && (
              <div className="rounded-lg border border-[color:var(--almanac-rule)] bg-white/60 px-3 py-2 text-xs text-[color:var(--almanac-ink)]">
                Ready to parse: <strong>{file.name}</strong>{" "}
                <span className="text-[color:var(--almanac-ink-soft)]">
                  ({Math.round(file.size / 1024)} KB) — click <em>Parse</em> below.
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="h-px flex-1 bg-[color:var(--almanac-rule)]" />
              <span className="text-[0.6rem] uppercase tracking-[0.15em] text-[color:var(--almanac-ink-soft)]">
                or paste text
              </span>
              <span className="h-px flex-1 bg-[color:var(--almanac-rule)]" />
            </div>

            <label className="grid gap-2">
              <span className="text-xs font-medium text-[color:var(--almanac-ink)]">
                Paste your resume text
              </span>
              <textarea
                className="min-h-[12rem] w-full rounded-xl border border-[color:var(--almanac-rule)] bg-white/60 px-3 py-2.5 text-sm leading-6 text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[#3F4A66] focus:bg-white"
                maxLength={12000}
                onChange={(e) => {
                  setText(e.target.value);
                  if (e.target.value) setFile(null);
                }}
                placeholder="Paste your resume, Common App activities list, or any structured activity history here..."
                value={text}
              />
            </label>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-3 px-6 py-5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[color:var(--almanac-ink-soft)]">
                {includedCount} of {reviewItems.length + reviewAwards.length} selected
              </p>
              <div className="flex gap-3 text-[0.7rem]">
                <button
                  className="text-[color:var(--almanac-ink-soft)] underline hover:text-[color:var(--almanac-ink)]"
                  onClick={() => {
                    setReviewItems((prev) => prev.map((a) => ({ ...a, _include: true })));
                    setReviewAwards((prev) => prev.map((a) => ({ ...a, _include: true })));
                  }}
                  type="button"
                >
                  Select all
                </button>
                <button
                  className="text-[color:var(--almanac-ink-soft)] underline hover:text-[color:var(--almanac-ink)]"
                  onClick={() => {
                    setReviewItems((prev) => prev.map((a) => ({ ...a, _include: false })));
                    setReviewAwards((prev) => prev.map((a) => ({ ...a, _include: false })));
                  }}
                  type="button"
                >
                  Deselect all
                </button>
              </div>
            </div>

            <div className="grid max-h-[26rem] gap-4 overflow-y-auto pr-1">
              {reviewItems.length > 0 && (
                <div className="grid gap-3">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
                    Activities ({reviewItems.length})
                  </p>
                  {reviewItems.map((item, i) => (
                    <ReviewCard
                      index={i}
                      isDuplicate={existingActivityMap.has(normalizeName(item.name))}
                      item={item}
                      key={i}
                      onChange={(patch) => updateItem(i, patch)}
                    />
                  ))}
                </div>
              )}

              {reviewAwards.length > 0 && (
                <div className="grid gap-3">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
                    Awards ({reviewAwards.length})
                  </p>
                  {reviewAwards.map((item, i) => (
                    <ReviewAwardCard
                      award={item}
                      isDuplicate={existingAwardMap.has(normalizeName(item.name))}
                      key={i}
                      onChange={(patch) => updateAward(i, patch)}
                    />
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
          </div>
        )}

        <footer className="flex items-center justify-between gap-2 border-t border-[color:var(--almanac-rule)] px-6 py-4">
          {step === "review" ? (
            <button
              className="rounded-full border border-[color:var(--almanac-rule)] px-5 py-2 text-sm font-medium text-[color:var(--almanac-ink)] transition hover:bg-black/5"
              onClick={() => {
                setStep("input");
                setError(null);
              }}
              type="button"
            >
              ← Back
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              className="rounded-full border border-[color:var(--almanac-rule)] px-5 py-2 text-sm font-medium text-[color:var(--almanac-ink)] transition hover:bg-black/5"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            {step === "input" ? (
              <button
                className="rounded-full bg-[color:var(--almanac-ink)] px-5 py-2 text-sm font-medium text-[color:var(--almanac-paper)] transition hover:opacity-90 disabled:opacity-50"
                disabled={isPending || (!text.trim() && !file)}
                onClick={handleParse}
                type="button"
              >
                {isPending ? "Parsing…" : "Parse"}
              </button>
            ) : (
              <button
                className="rounded-full bg-[color:var(--almanac-ink)] px-5 py-2 text-sm font-medium text-[color:var(--almanac-paper)] transition hover:opacity-90 disabled:opacity-50"
                disabled={isPending || includedCount === 0}
                onClick={handleCommit}
                type="button"
              >
                {isPending
                  ? "Importing…"
                  : `Import ${includedCount} ${includedCount === 1 ? "item" : "items"}`}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

function ReviewCard({
  index,
  isDuplicate = false,
  item,
  onChange,
}: {
  index: number;
  isDuplicate?: boolean;
  item: ReviewActivity;
  onChange: (patch: Partial<ReviewActivity>) => void;
}) {
  return (
    <div
      className={[
        "rounded-xl border p-4 transition",
        item._include
          ? "border-[color:var(--almanac-rule)] bg-white/60"
          : "border-dashed border-[color:var(--almanac-rule)] bg-transparent opacity-60",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <input
          aria-label={`Include ${item.name || `activity ${index + 1}`}`}
          checked={item._include}
          className="mt-1 size-4 accent-[color:var(--almanac-ink)]"
          onChange={(e) => onChange({ _include: e.target.checked })}
          type="checkbox"
        />
        <div className="min-w-0 flex-1 grid gap-2">
          {isDuplicate && (
            <DuplicateBanner
              kind="activity"
              mode={item._mode}
              onMode={(m) => onChange({ _mode: m })}
            />
          )}
          <LabeledField label="Activity name">
            <input
              className="w-full rounded-lg border border-[color:var(--almanac-rule)] bg-white/70 px-2.5 py-1.5 text-sm font-medium text-[color:var(--almanac-ink)] outline-none focus:border-[#3F4A66]"
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. Robotics Club"
              value={item.name ?? ""}
            />
          </LabeledField>
          <div className="grid gap-2 sm:grid-cols-2">
            <LabeledField label="Role / position">
              <input
                className="w-full rounded-lg border border-[color:var(--almanac-rule)] bg-white/70 px-2.5 py-1.5 text-xs text-[color:var(--almanac-ink)] outline-none focus:border-[#3F4A66]"
                onChange={(e) => onChange({ position: e.target.value })}
                placeholder="e.g. Founder, President"
                value={item.position ?? ""}
              />
            </LabeledField>
            <LabeledField label="Category">
              <input
                className="w-full rounded-lg border border-[color:var(--almanac-rule)] bg-white/70 px-2.5 py-1.5 text-xs text-[color:var(--almanac-ink)] outline-none focus:border-[#3F4A66]"
                onChange={(e) => onChange({ category: e.target.value })}
                placeholder="e.g. Science/Math"
                value={item.category ?? ""}
              />
            </LabeledField>
          </div>
          <LabeledField label="Description">
            <textarea
              className="min-h-[3.5rem] w-full resize-y rounded-lg border border-[color:var(--almanac-rule)] bg-white/70 px-2.5 py-1.5 text-xs leading-5 text-[color:var(--almanac-ink)] outline-none focus:border-[#3F4A66]"
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="What you did, your impact, key accomplishments…"
              value={item.description ?? ""}
            />
          </LabeledField>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <LabeledMini
              label="Hrs/wk"
              onChange={(v) => onChange({ hours_per_week: Number(v) || 0 })}
              value={String(item.hours_per_week ?? 0)}
            />
            <LabeledMini
              label="Wks/yr"
              onChange={(v) => onChange({ weeks_per_year: Number(v) || 0 })}
              value={String(item.weeks_per_year ?? 0)}
            />
            <LabeledMini
              label="Start"
              onChange={(v) => onChange({ start_date: v })}
              value={item.start_date ?? ""}
            />
            <LabeledMini
              label="End"
              onChange={(v) => onChange({ end_date: v })}
              value={item.end_date ?? ""}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <LabeledMini
              label="Grades (comma-separated)"
              onChange={(v) => onChange({ grades: splitCsv(v) })}
              value={(item.grades ?? []).join(", ")}
            />
            <LabeledMini
              label="Tags (comma-separated)"
              onChange={(v) => onChange({ tags: splitCsv(v) })}
              value={(item.tags ?? []).join(", ")}
            />
          </div>
          {(item.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(item.tags ?? []).map((tag, ti) => (
                <span
                  className="inline-flex items-center rounded-full bg-black/5 px-2 py-0.5 text-[0.65rem] font-medium text-[color:var(--almanac-ink)]"
                  key={ti}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Split a comma-separated string into trimmed, non-empty values. */
function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Wraps a field with a small uppercase caption above it. */
function LabeledField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-[0.6rem] uppercase tracking-[0.1em] text-[color:var(--almanac-ink-soft)]">
        {label}
      </span>
      {children}
    </label>
  );
}

/** Warning + Add-new / Replace-existing toggle shown on duplicate import items. */
function DuplicateBanner({
  kind,
  mode,
  onMode,
}: {
  kind: "activity" | "award";
  mode: ImportMode;
  onMode: (mode: ImportMode) => void;
}) {
  return (
    <div className="rounded-md bg-red-500/10 px-2.5 py-2 text-[0.7rem] leading-4 text-red-700">
      <p>
        An {kind} with this name already exists.{" "}
        {mode === "add" ? (
          <>This will be added as a <strong>separate new entry</strong>.</>
        ) : (
          <>This will <strong>overwrite</strong> your existing {kind}.</>
        )}
      </p>
      <div className="mt-1.5 inline-flex overflow-hidden rounded-full border border-red-500/40">
        <button
          className={[
            "px-2.5 py-1 text-[0.65rem] font-medium transition",
            mode === "add" ? "bg-red-600 text-white" : "text-red-700 hover:bg-red-500/10",
          ].join(" ")}
          onClick={() => onMode("add")}
          type="button"
        >
          Add as new
        </button>
        <button
          className={[
            "px-2.5 py-1 text-[0.65rem] font-medium transition",
            mode === "replace" ? "bg-red-600 text-white" : "text-red-700 hover:bg-red-500/10",
          ].join(" ")}
          onClick={() => onMode("replace")}
          type="button"
        >
          Replace existing
        </button>
      </div>
    </div>
  );
}

function LabeledMini({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-[0.6rem] uppercase tracking-[0.1em] text-[color:var(--almanac-ink-soft)]">
        {label}
      </span>
      <input
        className="w-full rounded-lg border border-[color:var(--almanac-rule)] bg-white/70 px-2 py-1 text-xs text-[color:var(--almanac-ink)] outline-none focus:border-[#3F4A66]"
        onChange={(e) => onChange(e.target.value)}
        value={value}
      />
    </label>
  );
}

function ReviewAwardCard({
  award,
  isDuplicate = false,
  onChange,
}: {
  award: ReviewAward;
  isDuplicate?: boolean;
  onChange: (patch: Partial<ReviewAward>) => void;
}) {
  return (
    <div
      className={[
        "rounded-xl border p-4 transition",
        award._include
          ? "border-[color:var(--almanac-rule)] bg-white/60"
          : "border-dashed border-[color:var(--almanac-rule)] bg-transparent opacity-60",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <input
          aria-label={`Include ${award.name || "award"}`}
          checked={award._include}
          className="mt-1 size-4 accent-[color:var(--almanac-ink)]"
          onChange={(e) => onChange({ _include: e.target.checked })}
          type="checkbox"
        />
        <div className="min-w-0 flex-1 grid gap-2">
          {isDuplicate && (
            <DuplicateBanner
              kind="award"
              mode={award._mode}
              onMode={(m) => onChange({ _mode: m })}
            />
          )}
          <LabeledField label="Award name">
            <input
              className="w-full rounded-lg border border-[color:var(--almanac-rule)] bg-white/70 px-2.5 py-1.5 text-sm font-medium text-[color:var(--almanac-ink)] outline-none focus:border-[#3F4A66]"
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. National Merit Finalist"
              value={award.name ?? ""}
            />
          </LabeledField>
          <div className="grid gap-2 sm:grid-cols-2">
            <LabeledField label="Granted by">
              <input
                className="w-full rounded-lg border border-[color:var(--almanac-rule)] bg-white/70 px-2.5 py-1.5 text-xs text-[color:var(--almanac-ink)] outline-none focus:border-[#3F4A66]"
                onChange={(e) => onChange({ organization: e.target.value })}
                placeholder="e.g. College Board"
                value={award.organization ?? ""}
              />
            </LabeledField>
            <LabeledField label="Year">
              <input
                className="w-full rounded-lg border border-[color:var(--almanac-rule)] bg-white/70 px-2.5 py-1.5 text-xs text-[color:var(--almanac-ink)] outline-none focus:border-[#3F4A66]"
                onChange={(e) => onChange({ year: e.target.value })}
                placeholder="e.g. 2024"
                value={award.year ?? ""}
              />
            </LabeledField>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <LabeledField label="Scope">
              <input
                className="w-full rounded-lg border border-[color:var(--almanac-rule)] bg-white/70 px-2.5 py-1.5 text-xs text-[color:var(--almanac-ink)] outline-none focus:border-[#3F4A66]"
                onChange={(e) => onChange({ scope: e.target.value })}
                placeholder="School, Regional, National…"
                value={award.scope ?? ""}
              />
            </LabeledField>
            <LabeledField label="Level">
              <input
                className="w-full rounded-lg border border-[color:var(--almanac-rule)] bg-white/70 px-2.5 py-1.5 text-xs text-[color:var(--almanac-ink)] outline-none focus:border-[#3F4A66]"
                onChange={(e) => onChange({ level: e.target.value })}
                placeholder="1st Place, Finalist…"
                value={award.level ?? ""}
              />
            </LabeledField>
          </div>
          <LabeledField label="Description">
            <textarea
              className="min-h-[3rem] w-full resize-y rounded-lg border border-[color:var(--almanac-rule)] bg-white/70 px-2.5 py-1.5 text-xs leading-5 text-[color:var(--almanac-ink)] outline-none focus:border-[#3F4A66]"
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Context about the award (optional)"
              value={award.description ?? ""}
            />
          </LabeledField>
          <LabeledMini
            label="Tags (comma-separated)"
            onChange={(v) => onChange({ tags: splitCsv(v) })}
            value={(award.tags ?? []).join(", ")}
          />
          {(award.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(award.tags ?? []).map((tag, ti) => (
                <span
                  className="inline-flex items-center rounded-full bg-black/5 px-2 py-0.5 text-[0.65rem] font-medium text-[color:var(--almanac-ink)]"
                  key={ti}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXPORT MODAL — Common App / UC / Resume formatters
// ============================================================================

type ExportTab = "commonapp" | "uc" | "resume" | "full";

function ExportModal({
  activity,
  fullRecordText,
  onClose,
}: {
  activity: Activity;
  fullRecordText?: string;
  onClose: () => void;
}) {
  const hasFull = Boolean(fullRecordText && fullRecordText.trim());
  const [tab, setTab] = useState<ExportTab>("commonapp");

  const generated = useMemo(() => {
    if (tab === "full") return fullRecordText ?? "";
    if (tab === "commonapp") return formatCommonApp(activity);
    if (tab === "uc") return formatUC(activity);
    return formatResume(activity);
  }, [tab, activity, fullRecordText]);

  const formatLabel =
    tab === "commonapp"
      ? "Common App"
      : tab === "uc"
        ? "UC"
        : tab === "full"
          ? "Full record"
          : "Resume";

  const tabs: Array<[ExportTab, string]> = [
    ["commonapp", "Common App"],
    ["uc", "UC App"],
    ["resume", "Resume"],
    ...(hasFull ? ([["full", "Full record"]] as Array<[ExportTab, string]>) : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[color:var(--almanac-rule)] px-6 py-4">
          <div>
            <h3 className="font-serif text-2xl text-[color:var(--almanac-ink)]">Export</h3>
            <p className="text-xs text-[color:var(--almanac-ink-soft)]">{activity.name}</p>
          </div>
          <button
            className="rounded-full p-1.5 text-[color:var(--almanac-ink-soft)] transition hover:bg-black/5"
            onClick={onClose}
            type="button"
          >
            <X size={16} />
          </button>
        </header>

        <div className="border-b border-[color:var(--almanac-rule)] px-6 pt-4">
          <div className="inline-flex gap-1 rounded-full border border-[color:var(--almanac-rule)] bg-white/60 p-1">
            {tabs.map(([id, label]) => {
              const active = tab === id;
              return (
                <button
                  className={[
                    "rounded-full px-4 py-1.5 text-xs font-medium transition",
                    active
                      ? "bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]"
                      : "text-[color:var(--almanac-ink-soft)] hover:text-[color:var(--almanac-ink)]",
                  ].join(" ")}
                  key={id}
                  onClick={() => setTab(id)}
                  type="button"
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <ExportPreview
          // Reset the editable text whenever the format changes.
          key={tab}
          charLimit={tab === "commonapp" ? 150 : tab === "uc" ? 350 : undefined}
          docTitle={`${activity.name} — ${formatLabel}`}
          fileBase={`${activity.name}-${formatLabel}`}
          initialText={generated}
          notes={tab === "full" ? undefined : <ExportNotes tab={tab} activity={activity} />}
          ongoing={activity.in_progress}
        />
      </div>
    </div>
  );
}

function BulkExportModal({
  activities,
  awards,
  onClose,
}: {
  activities: Activity[];
  awards: Award[];
  onClose: () => void;
}) {
  const [format, setFormat] = useState<"resume" | "commonapp" | "uc" | null>(null);
  const [resumeProfile, setResumeProfile] = useState<ResumeProfile | null>(null);

  // Load the saved résumé header once (used for the Resume format).
  useEffect(() => {
    void getResumeProfile().then((p) => setResumeProfile(p));
  }, []);

  const content = useMemo(() => {
    if (!format) return "";
    const fmt =
      format === "commonapp"
        ? formatCommonApp
        : format === "uc"
          ? formatUC
          : formatResume;

    const blocks: string[] = [];

    // Resume header + education (resume format only) — top of the resume.
    if (format === "resume") {
      const header = formatResumeHeader(resumeProfile);
      if (header) blocks.push(header);
      const edu = formatEducationBlock(resumeProfile?.education ?? []);
      if (edu) blocks.push(edu);
    }

    // Activities.
    if (activities.length) {
      const heading = format === "resume" ? "ACTIVITIES & EXPERIENCE\n" : "";
      blocks.push(heading + activities.map((a) => fmt(a)).join("\n\n──────────\n\n"));
    }

    // Awards — always appended.
    const awardsBlock = formatAwardsBlock(awards, format);
    if (awardsBlock) blocks.push(awardsBlock);

    // Skills & interests (resume format only) — bottom of the resume.
    if (format === "resume") {
      const skills = formatSimpleSection("SKILLS", resumeProfile?.skills);
      if (skills) blocks.push(skills);
      const interests = formatSimpleSection("INTERESTS", resumeProfile?.interests);
      if (interests) blocks.push(interests);
    }

    return blocks.join("\n\n\n");
  }, [format, activities, awards, resumeProfile]);

  const formatLabel =
    format === "commonapp"
      ? "Common App Activity List"
      : format === "uc"
        ? "UC Activity List"
        : "Resume";

  const FORMATS = [
    {
      id: "resume" as const,
      label: "Resume",
      description:
        "Your header, activities with bulleted accomplishments, and an awards section — ready to drop into a resume.",
    },
    {
      id: "commonapp" as const,
      label: "Common App Activity List",
      description: "Activities in Common App format (150-char descriptions), plus an honors list.",
    },
    {
      id: "uc" as const,
      label: "University of California Activity List",
      description: "Activities in UC format (350-char descriptions), plus awards & honors.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[color:var(--almanac-rule)] px-6 py-4">
          <div>
            <h3 className="font-serif text-2xl text-[color:var(--almanac-ink)]">
              Export
            </h3>
            <p className="text-xs text-[color:var(--almanac-ink-soft)]">
              {activities.length} {activities.length === 1 ? "activity" : "activities"}
              {awards.length
                ? ` · ${awards.length} ${awards.length === 1 ? "award" : "awards"}`
                : ""}{" "}
              · choose a format
            </p>
          </div>
          <button
            className="rounded-full p-1.5 text-[color:var(--almanac-ink-soft)] transition hover:bg-black/5"
            onClick={onClose}
            type="button"
          >
            <X size={16} />
          </button>
        </header>

        {format === null ? (
          // Step 1: pick a format.
          <div className="grid gap-3 px-6 py-5">
            {FORMATS.map((f) => (
              <button
                className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--almanac-rule)] bg-white/60 px-4 py-3 text-left transition hover:border-[color:var(--almanac-olive)] hover:bg-white"
                key={f.id}
                onClick={() => setFormat(f.id)}
                type="button"
              >
                <div>
                  <p className="text-sm font-medium text-[color:var(--almanac-ink)]">{f.label}</p>
                  <p className="mt-0.5 text-xs leading-5 text-[color:var(--almanac-ink-soft)]">
                    {f.description}
                  </p>
                </div>
                <FileText className="shrink-0 text-[color:var(--almanac-ink-soft)]" size={16} />
              </button>
            ))}
          </div>
        ) : (
          // Step 2: editable preview for the chosen format → export.
          <div>
            <div className="px-6 pt-4">
              <button
                className="text-xs font-medium text-[color:var(--almanac-ink-soft)] underline-offset-2 transition hover:text-[color:var(--almanac-ink)] hover:underline"
                onClick={() => setFormat(null)}
                type="button"
              >
                ← Choose a different format
              </button>
            </div>
            <ExportPreview
              key={format}
              docTitle={formatLabel}
              fileBase={formatLabel}
              initialText={content}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Editable export preview: shows the generated text in a textarea the user can
 * tweak, then exports the (possibly edited) text as a copy, PDF, or Word file.
 * Edits here never touch the saved activity — export-only.
 */
export function ExportPreview({
  charLimit,
  docTitle,
  fileBase,
  initialText,
  notes,
  ongoing,
}: {
  charLimit?: number;
  docTitle: string;
  fileBase: string;
  initialText: string;
  notes?: React.ReactNode;
  /** true = activity is in progress (present-tense verbs); false = past tense.
   *  undefined = let the model infer from the wording. */
  ongoing?: boolean;
}) {
  const [text, setText] = useState(initialText);
  const [copied, setCopied] = useState(false);
  const [condensing, setCondensing] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  function downloadPdf() {
    exportAsPdf(docTitle, [{ heading: "", body: text }], fileBase);
    toast.success("Downloaded as PDF.");
  }

  async function downloadDocx() {
    await exportAsDocx(docTitle, [{ heading: "", body: text }], fileBase);
    toast.success("Downloaded as Word document.");
  }

  // Pull the description block out of the formatted text (the line after
  // "Description (… max):"), so we can rewrite just that part.
  function extractDescription(): { desc: string; line: number; lines: string[] } | null {
    const lines = text.split("\n");
    const idx = lines.findIndex((l) => /^Description \(/i.test(l));
    if (idx === -1 || idx + 1 >= lines.length) return null;
    return { desc: lines[idx + 1], line: idx + 1, lines };
  }

  async function aiCondense() {
    if (!charLimit) return;
    const found = extractDescription();
    const target = found ? found.desc : text;
    if (target.trim().length <= charLimit) {
      toast.info("Already within the limit.");
      return;
    }
    setCondensing(true);
    try {
      const tenseRule =
        ongoing === true
          ? "This activity is ONGOING, so use PRESENT-tense action verbs (e.g. \"Guide…\", \"Manage…\", \"Run…\")."
          : ongoing === false
            ? "This activity has ENDED, so use PAST-tense action verbs (e.g. \"Guided…\", \"Managed…\", \"Ran…\")."
            : "Use present-tense verbs if the activity is ongoing, past-tense if it has ended — infer from the wording.";
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content:
                `Rewrite this activity description for a college application to pack in as much concrete detail as possible within ${charLimit} characters ` +
                `(use ${Math.floor(charLimit * 0.9)}–${charLimit} — get as close to the limit as you can). Rules:\n` +
                `- MAXIMIZE information density. Cut filler, transition, and connector words ("in order to", "as well as", "responsible for", "helped to", "various", "successfully", "a variety of", articles like "the/a" where droppable). Every word should add a fact.\n` +
                `- Write in first person but DROP the pronouns "I/we/my" — start each phrase with the verb.\n` +
                `- ${tenseRule}\n` +
                `- Use semicolons or commas to chain multiple accomplishments compactly rather than full sentences with conjunctions.\n` +
                `- Keep ALL specific accomplishments, numbers, scale, and outcomes — these are the priority; only cut filler, never substance.\n` +
                `- Start with a strong action verb; keep verb tense consistent.\n` +
                `- Describe the student's own actions; if the text clearly says multiple people did something you may note it, but default to their individual contributions.\n` +
                `- No bullet symbols, no quotes, no labels.\n` +
                `Return ONLY the rewritten description:\n\n${target}`,
            },
          ],
        }),
      });
      const data = (await res.json()) as { message?: string };
      let rewrite = (data.message ?? "").trim().replace(/^["']|["']$/g, "");
      if (!rewrite) {
        toast.error("Couldn't condense right now — try again.");
        return;
      }
      // Hard-guarantee the limit even if the model overshoots.
      if (rewrite.length > charLimit) rewrite = condenseToFit(rewrite, charLimit);

      if (found) {
        const next = [...found.lines];
        next[found.line] = rewrite;
        setText(next.join("\n"));
      } else {
        setText(rewrite);
      }
      toast.success(`Condensed to ${rewrite.length} characters.`);
    } catch {
      toast.error("Couldn't condense right now — try again.");
    } finally {
      setCondensing(false);
    }
  }

  return (
    <div className="px-6 py-5">
      <p className="mb-2 text-[0.7rem] text-[color:var(--almanac-ink-soft)]">
        Preview — edit the text below before exporting. Changes here don&apos;t affect
        your saved activity.
      </p>
      <textarea
        className="max-h-[24rem] min-h-[16rem] w-full resize-y overflow-y-auto rounded-xl border border-[color:var(--almanac-rule)] bg-white/70 p-4 font-mono text-xs leading-6 text-[color:var(--almanac-ink)] outline-none focus:border-[color:var(--almanac-olive)] focus:bg-white"
        onChange={(e) => setText(e.target.value)}
        value={text}
      />

      {notes}

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {charLimit ? (
          <button
            className="mr-auto inline-flex items-center gap-1.5 rounded-full border border-[color:var(--almanac-olive)] px-4 py-2 text-xs font-medium text-[color:var(--almanac-olive)] transition hover:bg-[color:var(--almanac-olive)]/10 disabled:opacity-50"
            disabled={condensing}
            onClick={aiCondense}
            type="button"
          >
            <Sparkles size={13} />
            {condensing ? "Condensing…" : "Condense to fit"}
          </button>
        ) : null}
        <button
          className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--almanac-rule)] px-4 py-2 text-xs font-medium text-[color:var(--almanac-ink)] transition hover:bg-black/5"
          onClick={copy}
          type="button"
        >
          <Copy size={13} />
          {copied ? "Copied!" : "Copy text"}
        </button>
        <button
          className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--almanac-rule)] px-4 py-2 text-xs font-medium text-[color:var(--almanac-ink)] transition hover:bg-black/5"
          onClick={downloadDocx}
          type="button"
        >
          <FileText size={13} />
          Word
        </button>
        <button
          className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--almanac-ink)] px-4 py-2 text-xs font-medium text-[color:var(--almanac-paper)] transition hover:opacity-90"
          onClick={downloadPdf}
          type="button"
        >
          <Download size={13} />
          PDF
        </button>
      </div>
    </div>
  );
}

function ExportNotes({
  tab,
  activity,
}: {
  tab: "commonapp" | "uc" | "resume";
  activity: Activity;
}) {
  const desc = activity.description ?? activity.impact ?? "";
  const limit = tab === "commonapp" ? 150 : tab === "uc" ? 350 : Infinity;
  const tooLong = desc.length > limit;

  return (
    <div className="mt-3 space-y-1 text-xs">
      {tab === "commonapp" && (
        <p className="text-[color:var(--almanac-ink-soft)]">
          Common App caps the description at <strong>150 characters</strong>. Your description is{" "}
          <strong className={tooLong ? "text-red-600" : ""}>{desc.length}</strong> — {tooLong ? "trim it down before pasting." : "ready to paste."}
        </p>
      )}
      {tab === "uc" && (
        <p className="text-[color:var(--almanac-ink-soft)]">
          UC allows up to <strong>350 characters</strong>. Your description is{" "}
          <strong className={tooLong ? "text-red-600" : ""}>{desc.length}</strong>.
        </p>
      )}
      {tab === "resume" && (
        <p className="text-[color:var(--almanac-ink-soft)]">
          Resume bullets work best at 1–2 lines each. Edit freely after pasting.
        </p>
      )}
    </div>
  );
}

/**
 * Condense `text` to fit within `limit` characters WITHOUT a trailing "…".
 * Trims at sentence then word boundaries, and abbreviates common filler so the
 * result lands as close to the limit as possible (target: at least 75% of the
 * limit — i.e. within 25% — whenever the source is long enough). Falls back to a
 * hard character cut only if a single word somehow exceeds the limit.
 */
function condenseToFit(text: string, limit: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;

  // Maximize density before trimming words: drop a leading pronoun, strip
  // common filler/connector phrases, and abbreviate. Goal is to keep facts and
  // cut only words that don't carry information.
  let s = clean
    .replace(/^(i|we)\s+/i, "")
    // Filler / connector phrases → removed or shortened.
    .replace(/\bin order to\b/gi, "to")
    .replace(/\bso as to\b/gi, "to")
    .replace(/\bas well as\b/gi, "&")
    .replace(/\b(was|am|is|were|are)\s+responsible for\b/gi, "")
    .replace(/\bresponsible for\b/gi, "")
    .replace(/\bhelped to\b/gi, "")
    .replace(/\bworked to\b/gi, "")
    .replace(/\bin charge of\b/gi, "led")
    .replace(/\bsuccessfully\b/gi, "")
    .replace(/\bactively\b/gi, "")
    .replace(/\beffectively\b/gi, "")
    .replace(/\ba variety of\b/gi, "")
    .replace(/\bvarious\b/gi, "")
    .replace(/\bnumerous\b/gi, "")
    .replace(/\bin addition\b/gi, "")
    .replace(/\bfurthermore\b/gi, "")
    .replace(/\bmoreover\b/gi, "")
    // Abbreviations.
    .replace(/\band\b/g, "&")
    .replace(/\bwith\b/g, "w/")
    .replace(/\bapproximately\b/gi, "~")
    .replace(/\bpercent\b/gi, "%")
    // Tidy up doubled spaces / stray punctuation left by removals.
    .replace(/\s+([,.;])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  // Capitalize the first letter after edits.
  s = s.charAt(0).toUpperCase() + s.slice(1);
  if (s.length <= limit) return s;

  // Goal is to PACK the field. Only accept a clean sentence ending if it
  // already lands very close to the limit (≥90%); otherwise fill word-by-word
  // right up to the cap.
  const sentences = s.match(/[^.!?]+[.!?]+/g) ?? [];
  let built = "";
  for (const sentence of sentences) {
    if ((built + sentence).trim().length <= limit) built += sentence;
    else break;
  }
  if (built.trim().length >= Math.floor(limit * 0.9)) return built.trim();

  // Fill word-by-word up to the limit.
  const words = s.split(" ");
  let out = "";
  for (const w of words) {
    const next = out ? `${out} ${w}` : w;
    if (next.length <= limit) out = next;
    else break;
  }
  if (out.length > 0) return out.replace(/[,;:]$/, "");

  // Single oversized token — hard cut as a last resort.
  return s.slice(0, limit);
}

function formatCommonApp(a: Activity): string {
  const desc = (a.description ?? a.impact ?? "").trim();
  // Common App field limits: position 50, org name 100, description 150.
  const position = condenseToFit(a.position || a.role || "—", 50);
  const org = condenseToFit(a.name, 100);
  const trimmedDesc = condenseToFit(desc, 150);
  const grades = a.grades.length ? a.grades.join(", ") : "—";
  return [
    `Activity Type: ${a.category || "—"}`,
    `Position/Leadership (50 char): ${position}`,
    `Organization Name (100 char): ${org}`,
    ``,
    `Description (150 char max):`,
    trimmedDesc || "—",
    ``,
    `Participation Grade Levels: ${grades}`,
    `Timing: ${a.in_progress ? "Ongoing" : "Specified dates"}`,
    `Hours per week: ${a.hours_per_week}`,
    `Weeks per year: ${a.weeks_per_year}`,
    `I intend to participate in college: (set in Common App)`,
  ].join("\n");
}

function formatUC(a: Activity): string {
  const desc = (a.description ?? a.impact ?? "").trim();
  const trimmedDesc = condenseToFit(desc, 350);
  const grades = a.grades.length ? a.grades.join(", ") : "—";
  return [
    `Category: ${a.category || "—"}`,
    `Activity/Organization: ${a.name}`,
    `Role: ${a.position || a.role || "—"}`,
    ``,
    `Description (350 char max):`,
    trimmedDesc || "—",
    ``,
    `Grade Levels: ${grades}`,
    `Hours per week: ${a.hours_per_week}`,
    `Weeks per year: ${a.weeks_per_year}`,
    `Start: ${a.start_date || "—"}   End: ${a.in_progress ? "Present" : a.end_date || "—"}`,
  ].join("\n");
}

function formatResume(a: Activity): string {
  const desc = a.description ?? a.impact ?? "";
  const bullets = desc
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => `  • ${s}`)
    .join("\n");
  const dateRange = `${a.start_date || ""} – ${a.in_progress ? "Present" : a.end_date || ""}`.trim();
  return [
    `${a.name.toUpperCase()}${dateRange.replace(/^-\s*$/, "") ? `    ${dateRange}` : ""}`,
    `${a.position || a.role || ""}${a.category ? `, ${a.category}` : ""}`,
    bullets || `  • ${desc || ""}`,
  ].join("\n");
}

// ── Award formatters ─────────────────────────────────────────────────────────

function awardLine(a: Award): string {
  const meta = [a.organization, a.scope, a.level, a.year].filter(Boolean).join(", ");
  return meta ? `${a.name} — ${meta}` : a.name;
}

function formatAwardResume(a: Award): string {
  const meta = [a.organization, a.scope, a.level, a.year].filter(Boolean).join(" · ");
  const head = `${a.name}${a.year ? `    ${a.year}` : ""}`;
  return [head, meta && !a.year ? meta : meta.replace(` · ${a.year}`, "")]
    .filter(Boolean)
    .join("\n");
}

/** Builds the awards block for a given format. Returns "" if no awards. */
function formatAwardsBlock(
  awards: Award[],
  format: "resume" | "commonapp" | "uc",
): string {
  if (!awards.length) return "";
  if (format === "resume") {
    return ["AWARDS & HONORS", ...awards.map((a) => `  • ${awardLine(a)}`)].join("\n");
  }
  // Common App & UC list honors as their own simple entries.
  const heading =
    format === "commonapp" ? "HONORS / AWARDS" : "AWARDS & HONORS (UC)";
  return [
    heading,
    ...awards.map((a, i) => {
      const desc = a.description ? ` — ${a.description}` : "";
      return `${i + 1}. ${awardLine(a)}${desc}`;
    }),
  ].join("\n");
}

/** Resume header from the saved resume profile. Returns "" if nothing set. */
function formatResumeHeader(p: ResumeProfile | null): string {
  if (!p) return "";
  const name = (p.full_name ?? "").trim();
  const contactParts = [p.email, p.phone, p.location, p.links]
    .map((x) => (x ?? "").trim())
    .filter(Boolean);
  const lines: string[] = [];
  if (name) lines.push(name.toUpperCase());
  if (contactParts.length) lines.push(contactParts.join("  ·  "));
  if (p.summary?.trim()) {
    lines.push("");
    lines.push(p.summary.trim());
  }
  if (!lines.length) return "";
  lines.push("══════════════════════════════════════");
  return lines.join("\n");
}

/** EDUCATION block — one entry per school. Returns "" if no schools set. */
function formatEducationBlock(education: ResumeEducation[]): string {
  const rows = education.filter((e) => (e.school ?? "").trim());
  if (!rows.length) return "";
  const lines: string[] = ["EDUCATION"];
  rows.forEach((e, i) => {
    if (i > 0) lines.push("");
    // School on the left, location/graduation as right-hand meta.
    const right = [e.location, e.graduation]
      .map((x) => (x ?? "").trim())
      .filter(Boolean)
      .join("  ·  ");
    const school = e.school.trim();
    lines.push(right ? `${school}    ${right}` : school);
    // Degree + GPA on the second line.
    const second = [e.degree?.trim(), e.gpa?.trim() ? `GPA ${e.gpa.trim()}` : ""]
      .filter(Boolean)
      .join("  ·  ");
    if (second) lines.push(`  ${second}`);
    // AP/IB, Dean's List, coursework — one bullet per line.
    (e.details ?? "")
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => lines.push(`  • ${s}`));
  });
  return lines.join("\n");
}

/** A simple titled section (SKILLS / INTERESTS). Multi-line input becomes
 *  bullets; a single line is kept inline. Returns "" if empty. */
function formatSimpleSection(heading: string, body: string | null | undefined): string {
  const text = (body ?? "").trim();
  if (!text) return "";
  const lines = text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length <= 1) return `${heading}\n${text}`;
  return [heading, ...lines.map((s) => `  • ${s}`)].join("\n");
}
