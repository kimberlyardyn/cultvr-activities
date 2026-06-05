"use client";

import { Pencil, Plus, Target, X } from "lucide-react";
import { useState } from "react";

export type PendingGoal = {
  /** Client-only id used to track this goal before it has a real DB id. */
  tempId: string;
  title: string;
  /** Full date string for the DB column (YYYY-MM-01). Empty = no target. */
  target_date: string;
};

/**
 * Lightweight goals editor used inside the New Activity / New Award modal —
 * before the parent row exists in the DB. The goals collected here are
 * staged on the draft and persisted by the server action once the parent
 * row is inserted. For EXISTING parents, use `LinkedGoals` instead (it goes
 * directly to the server).
 */
export function PendingGoalsEditor({
  goals,
  onChange,
}: {
  goals: PendingGoal[];
  onChange: (next: PendingGoal[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [month, setMonth] = useState(""); // YYYY-MM

  const reset = () => {
    setAdding(false);
    setEditingId(null);
    setTitle("");
    setMonth("");
  };

  const handleAdd = () => {
    if (!title.trim()) return;
    onChange([
      ...goals,
      {
        tempId: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: title.trim(),
        target_date: month ? `${month}-01` : "",
      },
    ]);
    reset();
  };

  const handleSaveEdit = () => {
    if (!editingId || !title.trim()) return;
    onChange(
      goals.map((g) =>
        g.tempId === editingId
          ? { ...g, title: title.trim(), target_date: month ? `${month}-01` : "" }
          : g,
      ),
    );
    reset();
  };

  const handleEdit = (goal: PendingGoal) => {
    setEditingId(goal.tempId);
    setAdding(false);
    setTitle(goal.title);
    setMonth(goal.target_date ? goal.target_date.slice(0, 7) : "");
  };

  const handleDelete = (tempId: string) => {
    onChange(goals.filter((g) => g.tempId !== tempId));
  };

  return (
    <div className="rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-medium text-[color:var(--almanac-ink)]">
          <Target size={13} />
          Goals &amp; Targets ({goals.length})
        </p>
        {!adding && !editingId && (
          <button
            className="inline-flex items-center gap-1 rounded-full border border-[color:var(--almanac-rule)] px-3 py-1.5 text-xs font-medium text-[color:var(--almanac-ink)] transition hover:bg-black/5"
            onClick={() => setAdding(true)}
            type="button"
          >
            <Plus size={12} />
            Add goal
          </button>
        )}
      </div>

      <p className="mt-1 text-[0.7rem] leading-4 text-[color:var(--almanac-ink-soft)]">
        Add short-term or long-term goals. Goals will be saved alongside this entry.
      </p>

      <div className="mt-3 space-y-2">
        {goals.length === 0 && !adding && (
          <div className="rounded-lg border border-dashed border-[color:var(--almanac-rule)] bg-white/40 px-3 py-2 text-xs text-[color:var(--almanac-ink-soft)]">
            No goals yet. Try something like <em>&quot;Be elected club president by May 2026&quot;</em> or <em>&quot;Mentor 3 new members this fall&quot;</em>.
          </div>
        )}

        {goals.map((g) =>
          editingId === g.tempId ? (
            <GoalForm
              key={g.tempId}
              title={title}
              month={month}
              onTitleChange={setTitle}
              onMonthChange={setMonth}
              onCancel={reset}
              onSave={handleSaveEdit}
              saveLabel="Save"
            />
          ) : (
            <div
              className="group flex items-start gap-3 rounded-lg border border-[color:var(--almanac-rule)] bg-white/50 px-3 py-2"
              key={g.tempId}
            >
              <Target className="mt-0.5 shrink-0 text-[color:var(--almanac-ink-soft)]" size={12} />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-5 text-[color:var(--almanac-ink)]">{g.title}</p>
                {g.target_date && (
                  <p className="mt-0.5 text-[0.65rem] uppercase tracking-[0.12em] text-[color:var(--almanac-ink-soft)]">
                    Target: {formatMonthYear(g.target_date)}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                <button
                  className="rounded-full p-1 text-[color:var(--almanac-ink-soft)] transition hover:bg-black/5 hover:text-[color:var(--almanac-ink)]"
                  onClick={() => handleEdit(g)}
                  title="Edit"
                  type="button"
                >
                  <Pencil size={11} />
                </button>
                <button
                  className="rounded-full p-1 text-[color:var(--almanac-ink-soft)] transition hover:bg-red-500/10 hover:text-red-600"
                  onClick={() => handleDelete(g.tempId)}
                  title="Remove"
                  type="button"
                >
                  <X size={11} />
                </button>
              </div>
            </div>
          ),
        )}

        {adding && (
          <GoalForm
            title={title}
            month={month}
            onTitleChange={setTitle}
            onMonthChange={setMonth}
            onCancel={reset}
            onSave={handleAdd}
            saveLabel="Add goal"
          />
        )}
      </div>
    </div>
  );
}

function GoalForm({
  title,
  month,
  onTitleChange,
  onMonthChange,
  onCancel,
  onSave,
  saveLabel,
}: {
  title: string;
  month: string;
  onTitleChange: (v: string) => void;
  onMonthChange: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
  saveLabel: string;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-[#3F4A66] bg-white/70 p-3">
      <label className="block">
        <span className="block text-[0.65rem] uppercase tracking-[0.12em] text-[color:var(--almanac-ink-soft)]">
          Goal / Target
        </span>
        <input
          autoFocus
          className="mt-0.5 w-full rounded-md border border-[color:var(--almanac-rule)] bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[#3F4A66]"
          onChange={(e) => onTitleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && title.trim()) {
              e.preventDefault();
              onSave();
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
          onChange={(e) => onMonthChange(e.target.value)}
          type="month"
          value={month}
        />
      </label>
      <div className="flex justify-end gap-2">
        <button
          className="rounded-md px-3 py-1 text-xs text-[color:var(--almanac-ink-soft)] hover:text-[color:var(--almanac-ink)]"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="rounded-md bg-[color:var(--almanac-ink)] px-3 py-1 text-xs font-medium text-[color:var(--almanac-paper)] disabled:opacity-50"
          disabled={!title.trim()}
          onClick={onSave}
          type="button"
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

function formatMonthYear(isoDate: string): string {
  const [y, m] = isoDate.split("-");
  if (!y || !m) return isoDate;
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
