"use client";

import { Check, ChevronDown, Pencil, Plus, Target, X } from "lucide-react";
import { useCallback, useState, useTransition } from "react";

import {
  createLinkedGoal,
  deleteGoal,
  toggleGoalStatus,
  updateLinkedGoal,
} from "@/app/dashboard/actions";
import type { Goal } from "@/lib/types";

type Props = {
  /** ID of the parent activity OR award. */
  parentId: string;
  /** Which kind of parent this is. */
  parentKind: "activity" | "award";
  /** Pre-filtered list of goals belonging to this parent. */
  goals: Goal[];
  /** When true, render goals as inert previews (used on sample cards). */
  readonly?: boolean;
};

export function LinkedGoals({ parentId, parentKind, goals, readonly = false }: Props) {
  // Default expanded so the add-goal control is visible immediately.
  // Collapse only as an option for cards with lots of goals.
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState(""); // YYYY-MM
  const [editTitle, setEditTitle] = useState("");
  const [editTargetDate, setEditTargetDate] = useState("");
  const [isPending, startTransition] = useTransition();

  const startEdit = useCallback((goal: Goal) => {
    setEditingId(goal.id);
    setEditTitle(goal.title);
    setEditTargetDate(goal.target_date ? goal.target_date.slice(0, 7) : "");
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditTitle("");
    setEditTargetDate("");
  }, []);

  const saveEdit = useCallback(() => {
    if (readonly || !editingId || !editTitle.trim()) return;
    const fd = new FormData();
    fd.set("id", editingId);
    fd.set("title", editTitle.trim());
    if (editTargetDate) fd.set("target_date", `${editTargetDate}-01`);
    startTransition(async () => {
      await updateLinkedGoal(fd);
      cancelEdit();
    });
  }, [readonly, editingId, editTitle, editTargetDate, cancelEdit]);

  const handleAdd = useCallback(() => {
    if (readonly || !title.trim()) return;
    const fd = new FormData();
    fd.set("title", title.trim());
    // Goals table stores DATE. Use the 1st of the chosen month so "May 2028" → "2028-05-01".
    if (targetDate) fd.set("target_date", `${targetDate}-01`);
    if (parentKind === "activity") fd.set("activity_id", parentId);
    else fd.set("award_id", parentId);
    startTransition(async () => {
      await createLinkedGoal(fd);
      setTitle("");
      setTargetDate("");
      setAdding(false);
    });
  }, [title, targetDate, parentKind, parentId, readonly]);

  const handleToggle = useCallback(
    (goal: Goal) => {
      if (readonly) return;
      const fd = new FormData();
      fd.set("id", goal.id);
      fd.set("status", goal.status);
      startTransition(() => {
        void toggleGoalStatus(fd);
      });
    },
    [readonly],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (readonly) return;
      const fd = new FormData();
      fd.set("id", id);
      startTransition(() => {
        void deleteGoal(fd);
      });
    },
    [readonly],
  );

  return (
    <section className="mt-4 border-t border-[color:var(--almanac-rule)] pt-3">
      <div className="flex items-center justify-between gap-2">
        <button
          className="flex items-center gap-2 rounded-md px-1 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-[color:var(--almanac-ink-soft)] transition hover:bg-black/5 hover:text-[color:var(--almanac-ink)]"
          onClick={() => setOpen(!open)}
          type="button"
        >
          <Target size={11} />
          Goals &amp; Targets ({goals.length})
          <ChevronDown
            className={open ? "rotate-180 transition" : "transition"}
            size={12}
          />
        </button>
        {!readonly && open && !adding && (
          <button
            className="inline-flex items-center gap-1 rounded-full bg-[color:var(--almanac-ink)] px-3 py-1.5 text-xs font-medium text-[color:var(--almanac-paper)] transition hover:opacity-90"
            onClick={() => setAdding(true)}
            type="button"
          >
            <Plus size={12} />
            Add goal
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 space-y-2">
          {goals.length === 0 && !adding && (
            <div className="rounded-lg border border-dashed border-[color:var(--almanac-rule)] bg-white/40 px-3 py-3 text-xs leading-5 text-[color:var(--almanac-ink-soft)]">
              No goals yet.{" "}
              {readonly ? (
                <>Set a forward-looking target on your own activities and awards.</>
              ) : (
                <>
                  Click <strong className="text-[color:var(--almanac-ink)]">+ Add goal</strong> above to set a forward-looking target — e.g. <em>&quot;Be elected club president&quot;</em> by May 2028.
                </>
              )}
            </div>
          )}

          {goals.map((goal) => {
            const achieved = goal.status === "achieved";
            const isEditing = editingId === goal.id;

            if (isEditing) {
              return (
                <div
                  className="space-y-2 rounded-lg border border-[#3F4A66] bg-white/70 p-3"
                  key={goal.id}
                >
                  <label className="block">
                    <span className="block text-[0.65rem] uppercase tracking-[0.12em] text-[color:var(--almanac-ink-soft)]">
                      Goal / Target
                    </span>
                    <input
                      autoFocus
                      className="mt-0.5 w-full rounded-md border border-[color:var(--almanac-rule)] bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[#3F4A66]"
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && editTitle.trim()) {
                          e.preventDefault();
                          saveEdit();
                        }
                      }}
                      value={editTitle}
                    />
                  </label>
                  <label className="block">
                    <span className="block text-[0.65rem] uppercase tracking-[0.12em] text-[color:var(--almanac-ink-soft)]">
                      Target month (optional)
                    </span>
                    <input
                      className="mt-0.5 w-full rounded-md border border-[color:var(--almanac-rule)] bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[#3F4A66]"
                      onChange={(e) => setEditTargetDate(e.target.value)}
                      type="month"
                      value={editTargetDate}
                    />
                  </label>
                  <div className="flex justify-end gap-2">
                    <button
                      className="rounded-md px-3 py-1 text-xs text-[color:var(--almanac-ink-soft)] hover:text-[color:var(--almanac-ink)]"
                      onClick={cancelEdit}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="rounded-md bg-[color:var(--almanac-ink)] px-3 py-1 text-xs font-medium text-[color:var(--almanac-paper)] disabled:opacity-50"
                      disabled={isPending || !editTitle.trim()}
                      onClick={saveEdit}
                      type="button"
                    >
                      Save
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                className={[
                  "group flex items-start gap-3 rounded-lg border px-3 py-2 transition",
                  achieved
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-[color:var(--almanac-rule)] bg-white/50",
                ].join(" ")}
                key={goal.id}
              >
                <button
                  className={[
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition",
                    achieved
                      ? "border-green-600 bg-green-600 text-white"
                      : "border-[color:var(--almanac-ink-soft)]/40 hover:border-[color:var(--almanac-ink)]",
                    readonly ? "cursor-default" : "",
                  ].join(" ")}
                  disabled={readonly}
                  onClick={() => handleToggle(goal)}
                  title={achieved ? "Mark as in progress" : "Mark as achieved"}
                  type="button"
                >
                  {achieved && <Check size={12} strokeWidth={3} />}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={[
                      "text-sm leading-5",
                      achieved
                        ? "text-[color:var(--almanac-ink-soft)] line-through"
                        : "text-[color:var(--almanac-ink)]",
                    ].join(" ")}
                  >
                    {goal.title}
                  </p>
                  {goal.target_date && (
                    <p className="mt-0.5 text-[0.65rem] uppercase tracking-[0.12em] text-[color:var(--almanac-ink-soft)]">
                      Target: {formatMonthYear(goal.target_date)}
                    </p>
                  )}
                </div>
                {!readonly && (
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                    <button
                      className="rounded-full p-1 text-[color:var(--almanac-ink-soft)] transition hover:bg-black/5 hover:text-[color:var(--almanac-ink)]"
                      onClick={() => startEdit(goal)}
                      title="Edit"
                      type="button"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      className="rounded-full p-1 text-[color:var(--almanac-ink-soft)] transition hover:bg-red-500/10 hover:text-red-600"
                      onClick={() => handleDelete(goal.id)}
                      title="Delete"
                      type="button"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {!readonly && adding && (
            <div className="space-y-2 rounded-lg border border-[color:var(--almanac-rule)] bg-white/60 p-3">
              <label className="block">
                <span className="block text-[0.65rem] uppercase tracking-[0.12em] text-[color:var(--almanac-ink-soft)]">
                  Goal / Target
                </span>
                <input
                  autoFocus
                  className="mt-0.5 w-full rounded-md border border-[color:var(--almanac-rule)] bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[#3F4A66]"
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && title.trim()) {
                      e.preventDefault();
                      handleAdd();
                    }
                  }}
                  placeholder="e.g., Be elected club president"
                  value={title}
                />
              </label>
              <label className="block">
                <span className="block text-[0.65rem] uppercase tracking-[0.12em] text-[color:var(--almanac-ink-soft)]">
                  Target month (optional)
                </span>
                <input
                  className="mt-0.5 w-full rounded-md border border-[color:var(--almanac-rule)] bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[#3F4A66]"
                  onChange={(e) => setTargetDate(e.target.value)}
                  type="month"
                  value={targetDate}
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  className="rounded-md px-3 py-1 text-xs text-[color:var(--almanac-ink-soft)] hover:text-[color:var(--almanac-ink)]"
                  onClick={() => {
                    setAdding(false);
                    setTitle("");
                    setTargetDate("");
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-md bg-[color:var(--almanac-ink)] px-3 py-1 text-xs font-medium text-[color:var(--almanac-paper)] disabled:opacity-50"
                  disabled={isPending || !title.trim()}
                  onClick={handleAdd}
                  type="button"
                >
                  Save goal
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function formatMonthYear(isoDate: string): string {
  // Stored as "YYYY-MM-DD" — render the month name + year.
  const [y, m] = isoDate.split("-");
  if (!y || !m) return isoDate;
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
