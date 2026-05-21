import Link from "next/link";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  ClipboardList,
  Mic,
  NotebookPen,
} from "lucide-react";

const workflows = [
  {
    icon: NotebookPen,
    title: "Brainstorm and notes",
    body: "Capture reflections, essay seeds, interview prep, and counselor meeting notes in one place.",
  },
  {
    icon: Brain,
    title: "Achievement coaching",
    body: "Use AI prompts to turn raw experiences into clearer activities, impact statements, and goals.",
  },
  {
    icon: ClipboardList,
    title: "Tasks and goals",
    body: "Track next steps across essays, recommendations, college research, deadlines, and follow-ups.",
  },
  {
    icon: Mic,
    title: "Voice sessions",
    body: "Talk through wins and blockers with a realtime voice coach using short-lived OpenAI tokens.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto flex min-h-[92vh] w-full max-w-7xl flex-col px-5 py-6">
        <nav className="flex items-center justify-between border-b border-black/10 pb-5">
          <Link className="text-lg font-semibold text-[#17201b]" href="/">
            Cultvr
          </Link>
          <div className="flex items-center gap-2">
            <Link
              className="rounded-md px-3 py-2 text-sm font-semibold text-[#355c46] hover:bg-white/70"
              href="/login"
            >
              Sign in
            </Link>
            <Link
              className="rounded-md bg-[#2f5d46] px-4 py-2 text-sm font-semibold text-white hover:bg-[#264b39]"
              href="/dashboard"
            >
              Open app
            </Link>
          </div>
        </nav>

        <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6f4d2d]">
              College planning workspace
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-tight text-[#17201b] sm:text-6xl">
              Cultvr helps students turn reflection into application momentum.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#55615b]">
              A lightweight counseling workflow for high school students to
              brainstorm, organize achievements, create goals, track tasks, and
              use AI by text or voice.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="flex h-12 items-center justify-center gap-2 rounded-md bg-[#2f5d46] px-5 font-semibold text-white hover:bg-[#264b39]"
                href="/login"
              >
                Start workspace
                <ArrowRight size={18} />
              </Link>
              <Link
                className="flex h-12 items-center justify-center rounded-md border border-black/15 bg-white/80 px-5 font-semibold text-[#17201b] hover:bg-white"
                href="/dashboard"
              >
                View dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <div className="rounded-lg bg-[#17201b] p-5 text-white">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-md bg-[#e0b35f] text-[#17201b]">
                  <CheckCircle2 size={20} />
                </span>
                <div>
                  <p className="font-semibold">Today&apos;s plan</p>
                  <p className="text-sm text-white/70">3 priorities</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 text-sm">
                <div className="rounded-md bg-white/10 p-3">
                  Draft robotics activity impact statement
                </div>
                <div className="rounded-md bg-white/10 p-3">
                  Record reflection on community project
                </div>
                <div className="rounded-md bg-white/10 p-3">
                  Schedule recommendation follow-up
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {workflows.map((workflow) => (
                <div
                  className="flex gap-3 rounded-lg border border-black/10 bg-[#fbfaf6] p-4"
                  key={workflow.title}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#e6eee7] text-[#355c46]">
                    <workflow.icon size={19} />
                  </span>
                  <div>
                    <h2 className="font-semibold text-[#17201b]">
                      {workflow.title}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[#65726b]">
                      {workflow.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
