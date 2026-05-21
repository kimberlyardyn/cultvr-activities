import { toggleTask } from "@/app/dashboard/actions";
import type { Activity, Goal, Note, StudentTask } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function NotesList({ notes }: { notes: Note[] }) {
  if (!notes.length) return <EmptyState label="No notes yet." />;

  return (
    <div className="grid gap-3">
      {notes.map((note) => (
        <article
          className="rounded-lg border border-black/10 bg-[#fbfaf6] p-4"
          key={note.id}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-[#17201b]">{note.title}</h3>
            <span className="rounded-md bg-[#e6eee7] px-2 py-1 text-xs font-medium text-[#355c46]">
              {note.category}
            </span>
          </div>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#5b665f]">
            {note.body}
          </p>
        </article>
      ))}
    </div>
  );
}

export function GoalsList({ goals }: { goals: Goal[] }) {
  if (!goals.length) return <EmptyState label="No goals yet." />;

  return (
    <div className="grid gap-3">
      {goals.map((goal) => (
        <div
          className="rounded-lg border border-black/10 bg-[#fbfaf6] p-4"
          key={goal.id}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium text-[#17201b]">{goal.title}</p>
            <span className="rounded-md bg-[#efe5d6] px-2 py-1 text-xs font-medium text-[#76512f]">
              {goal.status}
            </span>
          </div>
          <p className="mt-2 text-xs text-[#65726b]">
            Target: {formatDate(goal.target_date)}
          </p>
        </div>
      ))}
    </div>
  );
}

export function TasksList({ tasks }: { tasks: StudentTask[] }) {
  if (!tasks.length) return <EmptyState label="No tasks yet." />;

  return (
    <div className="grid gap-3">
      {tasks.map((task) => (
        <form
          action={toggleTask}
          className="flex items-start gap-3 rounded-lg border border-black/10 bg-[#fbfaf6] p-4"
          key={task.id}
        >
          <input name="id" type="hidden" value={task.id} />
          <input name="status" type="hidden" value={task.status} />
          <button
            aria-label="Toggle task status"
            className="mt-0.5 flex size-5 items-center justify-center rounded border border-[#355c46] text-xs text-[#355c46]"
          >
            {task.status === "done" ? "x" : ""}
          </button>
          <div>
            <p className="font-medium text-[#17201b]">{task.title}</p>
            <p className="mt-1 text-xs text-[#65726b]">
              Due: {formatDate(task.due_date)}
            </p>
          </div>
        </form>
      ))}
    </div>
  );
}

export function ActivitiesList({ activities }: { activities: Activity[] }) {
  if (!activities.length) return <EmptyState label="No activities yet." />;

  return (
    <div className="grid gap-3">
      {activities.map((activity) => (
        <article
          className="rounded-lg border border-black/10 bg-[#fbfaf6] p-4"
          key={activity.id}
        >
          <h3 className="font-semibold text-[#17201b]">{activity.name}</h3>
          <p className="mt-1 text-sm text-[#65726b]">
            {[activity.role, activity.years].filter(Boolean).join(" - ")}
          </p>
          {activity.impact ? (
            <p className="mt-2 text-sm leading-6 text-[#5b665f]">
              {activity.impact}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-black/20 bg-[#fbfaf6] p-5 text-sm text-[#65726b]">
      {label}
    </div>
  );
}
