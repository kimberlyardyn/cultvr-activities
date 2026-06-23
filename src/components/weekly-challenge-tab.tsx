"use client";

import {
  Brain,
  Check,
  Flag,
  Megaphone,
  Pencil,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState, useTransition, type ComponentType } from "react";

import {
  createWeeklyChallenge,
  deleteWeeklyChallenge,
  toggleWeeklyChallengeStatus,
  updateWeeklyChallenge,
} from "@/app/dashboard/actions";
import type { WeeklyChallenge } from "@/lib/types";

// ============================================================================
// CATEGORIES — short library of starter prompts per category
// ============================================================================

type CategoryDef = {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  color: string;
  blurb: string;
  prompts: string[];
};

const CATEGORIES: CategoryDef[] = [
  {
    id: "Reflection & Intent",
    label: "Reflection & Intent",
    icon: Brain,
    color: "#4e5b7a",
    blurb: "Make your involvement more intentional, deeper, and clearly yours.",
    prompts: [
      "Add one measurable outcome to an activity you already do.",
      "Turn a passive interest into something more intentional or strategic.",
      "Replace passive participation with a defined role.",
      "Follow through on one thing you’ve been postponing.",
      "Practice explaining your activity clearly to someone unfamiliar with it.",
      "Raise the standard you hold yourself to in one area.",
      "Clarify why a certain activity matters to you and act accordingly.",
      "Identify what differentiates your involvement from others’.",
      "Identify the most valuable contribution you make to an activity — and strengthen it.",
      "Identify and cut something that isn’t adding value.",
      "Write a journal entry reflecting on an activity that is meaningful.",
      "Solve a small problem that others overlook.",
      "Replace “showing up” with intentional contribution.",
      "Identify the ways your activities are building your personal development.",
      "Build reliability and trust through follow-through.",
      "Clarify your role as if you had to explain it in one sentence.",
      "Make a small but meaningful upgrade to how you operate.",
      "Identify one way you can push beyond your comfort zone.",
      "Adjust one activity so it better reflects who you are now.",
      "Remove ambiguity from your role or contribution.",
      "Take one step that makes an activity unmistakably yours.",
    ],
  },
  {
    id: "Impact & Story",
    label: "Impact & Story",
    icon: Megaphone,
    color: "#d27b57",
    blurb: "Make your work visible and the story behind it clear.",
    prompts: [
      "Choose one way to make your progress more visible (portfolio, vlog, writing).",
      "Strengthen the narrative behind why you do a certain activity (______).",
      "Identify what a certain activity (______) demonstrates about you — and reinforce it.",
      "Identify one new award, honor, or recognition you want to add to your profile.",
    ],
  },
  {
    id: "Strategy & Planning",
    label: "Strategy & Planning",
    icon: Target,
    color: "#7a9e7a",
    blurb: "Choose where to spend your time, and why, this week.",
    prompts: [
      "Document your achievement and progress for this past month.",
      "Set a clear short-term goal for an ongoing activity.",
      "Commit to consistency rather than intensity this week.",
      "Reduce busywork and focus on what actually matters.",
      "Clarify expectations with others you are coordinating with.",
      "Align how you spend time with how you want to be perceived.",
      "Identify what success looks like this month — not someday.",
      "Increase momentum through consistently showing up.",
      "Make one decision that prioritizes depth over appearance.",
    ],
  },
  {
    id: "Skills & Improvement",
    label: "Skills & Improvement",
    icon: TrendingUp,
    color: "#efc97a",
    blurb: "Sharpen one skill or process tied to an activity you already do.",
    prompts: [
      "Identify one weakness in a current activity (process, consistency, follow-through) and determine how to target it.",
      "Track time spent on one of your major activities and analyze your efficiency.",
      "Strengthen one skill that directly supports an existing activity.",
      "Identify a gap in your skill set and begin addressing it.",
      "Improve efficiency or quality in how you work on an activity.",
      "Seek targeted feedback from a peer or mentor on something specific you’re doing.",
      "Create a plan to turn a challenge or setback into concrete improvement.",
      "Translate your involvement in an activity into skills colleges actually recognize.",
      "Improve clarity, organization, or professionalism in an activity.",
      "Focus on quality over quantity this week.",
      "Improve one outcome that someone else relies on.",
      "Improve planning or preparation before engaging in an activity.",
      "Improve how your activity would read on an application.",
      "Clarify what you’ve actually learned through an activity and how it relates to long-term goals.",
      "Identify key soft skills you want to improve and the ways you can develop them.",
      "Identify key ways you can increase competence at an activity.",
    ],
  },
  {
    id: "Leadership & Initiative",
    label: "Leadership & Initiative",
    icon: Flag,
    color: "#9b7ab8",
    blurb: "Step up, take ownership, and act without being asked.",
    prompts: [
      "Review a leadership/service activity to clarify your actual impact.",
      "Identify one responsibility you could take fuller ownership of this week.",
      "Turn informal experience into a structured responsibility.",
      "Replace “helping” with “leading” in one moment.",
      "Make one decision independently that improves a current activity.",
      "Improve how you collaborate or communicate with teammates.",
      "Take initiative without being asked.",
      "Identify one community issue you want to target this next week.",
      "Identify one person with whom you would like to collaborate on an activity.",
      "Take responsibility for learning something you’ve avoided.",
    ],
  },
];

const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

// ============================================================================
// DATE HELPERS — weeks start on Monday
// ============================================================================

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

function formatWeekRange(weekStart: string): string {
  const [y, m, d] = weekStart.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const startStr = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const endStr = end.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startStr} – ${endStr}`;
}

// ============================================================================
// TAB
// ============================================================================

export function WeeklyChallengeTab({
  challenges,
}: {
  challenges: WeeklyChallenge[];
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<WeeklyChallenge | null>(null);
  const [, startTransition] = useTransition();

  const currentWeek = useMemo(() => toISODate(startOfWeek(new Date())), []);

  // Group challenges by week
  const byWeek = useMemo(() => {
    const map = new Map<string, WeeklyChallenge[]>();
    for (const c of challenges) {
      const key = c.week_start_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [challenges]);

  const currentWeekChallenges = challenges.filter(
    (c) => c.week_start_date === currentWeek,
  );

  const handleToggle = useCallback((c: WeeklyChallenge) => {
    const fd = new FormData();
    fd.set("id", c.id);
    fd.set("status", c.status);
    startTransition(() => {
      void toggleWeeklyChallengeStatus(fd);
    });
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (!confirm("Delete this challenge?")) return;
    const fd = new FormData();
    fd.set("id", id);
    startTransition(() => {
      void deleteWeeklyChallenge(fd);
    });
  }, []);

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-[color:var(--almanac-ink-soft)]">
            Weekly Challenge
          </p>
          <h2 className="mt-2 font-serif text-3xl leading-tight text-[color:var(--almanac-ink)] md:text-4xl">
            Push yourself one week at a time
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
            Pick a category, name a challenge, and commit for the week. Small, specific commitments compound — try one or two per week instead of vague resolutions.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-full bg-[color:var(--almanac-ink)] px-5 py-2.5 text-sm font-medium text-[color:var(--almanac-paper)] transition hover:opacity-90"
          onClick={() => setAdding(true)}
          type="button"
        >
          <Plus size={15} />
          Set a challenge
        </button>
      </header>

      {/* Current week section */}
      <section className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-5 md:p-6">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.18em] text-[color:var(--almanac-ink-soft)]">
              This week
            </p>
            <p className="mt-0.5 font-serif text-xl italic text-[color:var(--almanac-ink)]">
              {formatWeekRange(currentWeek)}
            </p>
          </div>
          <p className="text-xs text-[color:var(--almanac-ink-soft)]">
            {currentWeekChallenges.length}{" "}
            {currentWeekChallenges.length === 1 ? "challenge" : "challenges"}
          </p>
        </div>

        {currentWeekChallenges.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-[color:var(--almanac-rule)] bg-white/40 px-4 py-6 text-center">
            <Target className="mx-auto text-[color:var(--almanac-ink-soft)]" size={20} />
            <p className="mt-2 text-sm text-[color:var(--almanac-ink-soft)]">
              No challenge set for this week yet. Click <strong>Set a challenge</strong> to pick one.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {currentWeekChallenges.map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                onToggle={() => handleToggle(c)}
                onEdit={() => setEditing(c)}
                onDelete={() => handleDelete(c.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Past weeks */}
      {byWeek.filter(([w]) => w !== currentWeek).length > 0 && (
        <section>
          <h3 className="mb-3 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[color:var(--almanac-ink-soft)]">
            Past weeks
          </h3>
          <div className="space-y-4">
            {byWeek
              .filter(([w]) => w !== currentWeek)
              .map(([week, items]) => (
                <article
                  className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-4 md:p-5"
                  key={week}
                >
                  <div className="flex items-baseline justify-between">
                    <p className="font-serif text-lg italic text-[color:var(--almanac-ink)]">
                      {formatWeekRange(week)}
                    </p>
                    <p className="text-xs text-[color:var(--almanac-ink-soft)]">
                      {items.filter((c) => c.status === "completed").length} of{" "}
                      {items.length} done
                    </p>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {items.map((c) => (
                      <ChallengeCard
                        key={c.id}
                        challenge={c}
                        onToggle={() => handleToggle(c)}
                        onEdit={() => setEditing(c)}
                        onDelete={() => handleDelete(c.id)}
                        compact
                      />
                    ))}
                  </div>
                </article>
              ))}
          </div>
        </section>
      )}

      {adding && (
        <ChallengeEditor
          weekStart={currentWeek}
          onCancel={() => setAdding(false)}
          onSaved={() => setAdding(false)}
        />
      )}

      {editing && (
        <ChallengeEditor
          existing={editing}
          weekStart={editing.week_start_date}
          onCancel={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// CARD
// ============================================================================

function ChallengeCard({
  challenge,
  onToggle,
  onEdit,
  onDelete,
  compact = false,
}: {
  challenge: WeeklyChallenge;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  compact?: boolean;
}) {
  const cat = challenge.category ? CATEGORY_BY_ID.get(challenge.category) : null;
  const Icon = cat?.icon ?? Target;
  const done = challenge.status === "completed";

  return (
    <article
      className={[
        "group flex items-start gap-3 rounded-xl border px-4 py-3 transition",
        done
          ? "border-green-500/30 bg-green-500/5"
          : "border-[color:var(--almanac-rule)] bg-white/50",
      ].join(" ")}
    >
      <button
        className={[
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition",
          done
            ? "border-green-600 bg-green-600 text-white"
            : "border-[color:var(--almanac-ink-soft)]/40 hover:border-[color:var(--almanac-ink)]",
        ].join(" ")}
        onClick={onToggle}
        title={done ? "Mark as not done" : "Mark as done"}
        type="button"
      >
        {done && <Check size={14} strokeWidth={3} />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {cat && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.12em]"
              style={{
                backgroundColor: `${cat.color}20`,
                color: cat.color,
              }}
            >
              <Icon size={10} />
              {cat.label}
            </span>
          )}
        </div>
        <p
          className={[
            "mt-1 leading-5",
            compact ? "text-sm" : "text-base",
            done
              ? "text-[color:var(--almanac-ink-soft)] line-through"
              : "text-[color:var(--almanac-ink)]",
          ].join(" ")}
        >
          {challenge.title}
        </p>
        {!compact && challenge.description && (
          <p className="mt-1 text-xs leading-5 text-[color:var(--almanac-ink-soft)]">
            {challenge.description}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
        <button
          className="rounded-full p-1.5 text-[color:var(--almanac-ink-soft)] transition hover:bg-black/5 hover:text-[color:var(--almanac-ink)]"
          onClick={onEdit}
          title="Edit"
          type="button"
        >
          <Pencil size={12} />
        </button>
        <button
          className="rounded-full p-1.5 text-[color:var(--almanac-ink-soft)] transition hover:bg-red-500/10 hover:text-red-600"
          onClick={onDelete}
          title="Delete"
          type="button"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </article>
  );
}

// ============================================================================
// EDITOR MODAL
// ============================================================================

function ChallengeEditor({
  existing,
  weekStart,
  onCancel,
  onSaved,
}: {
  existing?: WeeklyChallenge;
  weekStart: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [category, setCategory] = useState(existing?.category ?? "");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [isPending, startTransition] = useTransition();

  const handlePickPrompt = useCallback((prompt: string, catId: string) => {
    setCategory(catId);
    setTitle(prompt);
  }, []);

  const handleSave = useCallback(() => {
    if (!title.trim()) return;
    const fd = new FormData();
    if (existing) fd.set("id", existing.id);
    fd.set("title", title.trim());
    fd.set("category", category);
    fd.set("description", description);
    fd.set("week_start_date", weekStart);
    startTransition(async () => {
      if (existing) await updateWeeklyChallenge(fd);
      else await createWeeklyChallenge(fd);
      onSaved();
    });
  }, [existing, title, category, description, weekStart, onSaved]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[color:var(--almanac-rule)] px-6 py-4">
          <div>
            <h3 className="font-serif text-2xl text-[color:var(--almanac-ink)]">
              {existing ? "Edit challenge" : "Set a challenge"}
            </h3>
            <p className="text-xs text-[color:var(--almanac-ink-soft)]">
              For week of {formatWeekRange(weekStart)}
            </p>
          </div>
          <button
            className="rounded-full p-1.5 text-[color:var(--almanac-ink-soft)] transition hover:bg-black/5"
            onClick={onCancel}
            type="button"
          >
            <X size={16} />
          </button>
        </header>

        <div className="grid gap-5 px-6 py-5">
          {/* Category picker */}
          <div>
            <p className="text-xs font-medium text-[color:var(--almanac-ink)]">
              Category
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {CATEGORIES.map((cat) => {
                const active = category === cat.id;
                const Icon = cat.icon;
                return (
                  <button
                    className={[
                      "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-xs font-medium leading-4 transition",
                      active
                        ? "border-[color:var(--almanac-ink)] bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]"
                        : "border-[color:var(--almanac-rule)] bg-white/60 text-[color:var(--almanac-ink)] hover:border-[color:var(--almanac-ink-soft)]",
                    ].join(" ")}
                    key={cat.id}
                    onClick={() => setCategory(active ? "" : cat.id)}
                    type="button"
                  >
                    <Icon size={18} />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Suggested prompts for selected category */}
          {category && CATEGORY_BY_ID.get(category) && (
            <div>
              <p className="text-xs font-medium text-[color:var(--almanac-ink)]">
                Suggestions <span className="font-normal text-[color:var(--almanac-ink-soft)]">— tap one to use, or write your own below</span>
              </p>
              <p className="mt-1 text-xs italic text-[color:var(--almanac-ink-soft)]">
                {CATEGORY_BY_ID.get(category)!.blurb}
              </p>
              <div className="mt-2 flex max-h-72 flex-col gap-1.5 overflow-y-auto rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-2">
                {CATEGORY_BY_ID.get(category)!.prompts.map((prompt) => (
                  <button
                    className="rounded-lg border border-[color:var(--almanac-rule)] bg-white/60 px-3 py-2 text-left text-sm leading-5 text-[color:var(--almanac-ink)] transition hover:bg-white hover:shadow-sm"
                    key={prompt}
                    onClick={() => handlePickPrompt(prompt, category)}
                    type="button"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title */}
          <label className="block">
            <span className="text-xs font-medium text-[color:var(--almanac-ink)]">
              Your challenge
            </span>
            <input
              autoFocus
              className="mt-1 w-full rounded-xl border border-[color:var(--almanac-rule)] bg-white/60 px-3 py-2.5 text-sm text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[#3F4A66] focus:bg-white"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Lead one team meeting this week"
              type="text"
              value={title}
            />
          </label>

          {/* Notes */}
          <label className="block">
            <span className="text-xs font-medium text-[color:var(--almanac-ink)]">
              Notes (optional)
            </span>
            <textarea
              className="mt-1 min-h-[4rem] w-full rounded-xl border border-[color:var(--almanac-rule)] bg-white/60 px-3 py-2.5 text-sm leading-5 text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[#3F4A66] focus:bg-white"
              maxLength={2000}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why this challenge? How will you measure done?"
              value={description}
            />
          </label>
        </div>

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
            disabled={isPending || !title.trim()}
            onClick={handleSave}
            type="button"
          >
            {isPending ? "Saving…" : existing ? "Update challenge" : "Set challenge"}
          </button>
        </footer>
      </div>
    </div>
  );
}
