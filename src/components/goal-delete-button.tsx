"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";

import { deleteGoal } from "@/app/dashboard/actions";
import { toast } from "@/components/toast";

/**
 * Always-visible "delete goal" control with a confirmation step. Calls
 * `onDeleted` right away so the parent can hide the goal optimistically, and
 * `onRestore` if the delete fails.
 */
export function GoalDeleteButton({
  goalId,
  goalTitle,
  onDeleted,
  onRestore,
  size = 13,
}: {
  goalId: string;
  goalTitle: string;
  onDeleted?: (id: string) => void;
  onRestore?: (id: string) => void;
  size?: number;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(`Delete the goal "${goalTitle}"? This can't be undone.`)) return;
    onDeleted?.(goalId);
    const fd = new FormData();
    fd.set("id", goalId);
    startTransition(async () => {
      try {
        await deleteGoal(fd);
        toast.success("Goal deleted.");
      } catch {
        onRestore?.(goalId);
        toast.error("Couldn't delete that goal. Please try again.");
      }
    });
  }

  return (
    <button
      aria-label={`Delete goal: ${goalTitle}`}
      className="shrink-0 rounded-full p-1.5 text-[color:var(--almanac-ink-soft)] transition hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50"
      disabled={pending}
      onClick={handleClick}
      title="Delete goal"
      type="button"
    >
      <Trash2 size={size} />
    </button>
  );
}

/** Small helper for optimistic hide/restore of deleted goal ids. */
export function nextHidden(prev: Set<string>, id: string, hide: boolean) {
  const next = new Set(prev);
  if (hide) next.add(id);
  else next.delete(id);
  return next;
}
