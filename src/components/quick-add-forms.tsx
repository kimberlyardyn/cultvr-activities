import {
  createActivity,
  createGoal,
  createNote,
  createTask,
  uploadDocument,
} from "@/app/dashboard/actions";

export function QuickAddForms() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <form
        action={createNote}
        className="rounded-lg border border-black/10 bg-[#fbfaf6] p-4"
      >
        <h3 className="font-semibold text-[#17201b]">Reflection note</h3>
        <div className="mt-3 grid gap-2">
          <input
            className="h-10 rounded-md border border-black/15 px-3 text-sm outline-none focus:border-[#355c46]"
            name="title"
            placeholder="Title"
            required
          />
          <input
            className="h-10 rounded-md border border-black/15 px-3 text-sm outline-none focus:border-[#355c46]"
            defaultValue="Reflection"
            name="category"
            placeholder="Category"
            required
          />
          <textarea
            className="min-h-28 rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#355c46]"
            name="body"
            placeholder="What happened, why it mattered, what you learned..."
            required
          />
        </div>
        <button className="mt-3 h-10 rounded-md bg-[#2f5d46] px-4 text-sm font-semibold text-white hover:bg-[#264b39]">
          Add note
        </button>
      </form>

      <form
        action={createGoal}
        className="rounded-lg border border-black/10 bg-[#fbfaf6] p-4"
      >
        <h3 className="font-semibold text-[#17201b]">Goal</h3>
        <div className="mt-3 grid gap-2">
          <input
            className="h-10 rounded-md border border-black/15 px-3 text-sm outline-none focus:border-[#355c46]"
            name="title"
            placeholder="Finish first Common App essay draft"
            required
          />
          <input
            className="h-10 rounded-md border border-black/15 px-3 text-sm outline-none focus:border-[#355c46]"
            name="target_date"
            type="date"
          />
        </div>
        <button className="mt-3 h-10 rounded-md bg-[#2f5d46] px-4 text-sm font-semibold text-white hover:bg-[#264b39]">
          Add goal
        </button>
      </form>

      <form
        action={createTask}
        className="rounded-lg border border-black/10 bg-[#fbfaf6] p-4"
      >
        <h3 className="font-semibold text-[#17201b]">Task</h3>
        <div className="mt-3 grid gap-2">
          <input
            className="h-10 rounded-md border border-black/15 px-3 text-sm outline-none focus:border-[#355c46]"
            name="title"
            placeholder="Ask teacher for recommendation"
            required
          />
          <input
            className="h-10 rounded-md border border-black/15 px-3 text-sm outline-none focus:border-[#355c46]"
            name="due_date"
            type="date"
          />
        </div>
        <button className="mt-3 h-10 rounded-md bg-[#2f5d46] px-4 text-sm font-semibold text-white hover:bg-[#264b39]">
          Add task
        </button>
      </form>

      <form
        action={createActivity}
        className="rounded-lg border border-black/10 bg-[#fbfaf6] p-4"
      >
        <h3 className="font-semibold text-[#17201b]">Activity</h3>
        <div className="mt-3 grid gap-2">
          <input
            className="h-10 rounded-md border border-black/15 px-3 text-sm outline-none focus:border-[#355c46]"
            name="name"
            placeholder="Robotics team"
            required
          />
          <input
            className="h-10 rounded-md border border-black/15 px-3 text-sm outline-none focus:border-[#355c46]"
            name="role"
            placeholder="Role"
          />
          <input
            className="h-10 rounded-md border border-black/15 px-3 text-sm outline-none focus:border-[#355c46]"
            name="years"
            placeholder="Years active"
          />
          <textarea
            className="min-h-20 rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#355c46]"
            name="impact"
            placeholder="Impact, leadership, awards, outcomes"
          />
        </div>
        <button className="mt-3 h-10 rounded-md bg-[#2f5d46] px-4 text-sm font-semibold text-white hover:bg-[#264b39]">
          Add activity
        </button>
      </form>

      <form
        action={uploadDocument}
        className="rounded-lg border border-black/10 bg-[#fbfaf6] p-4 xl:col-span-2"
      >
        <h3 className="font-semibold text-[#17201b]">Upload document</h3>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            className="min-h-10 flex-1 rounded-md border border-black/15 bg-white px-3 py-2 text-sm"
            name="file"
            required
            type="file"
          />
          <button className="h-10 rounded-md bg-[#17201b] px-4 text-sm font-semibold text-white hover:bg-black">
            Upload
          </button>
        </div>
      </form>
    </div>
  );
}
