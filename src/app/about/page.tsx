import { ArrowRight, BookOpen, Mic, Sparkles } from "lucide-react";
import Link from "next/link";

import { PublicNav } from "@/components/public-nav";

const pillars = [
  {
    icon: BookOpen,
    eyebrow: "The journal",
    title: "A record that grows with you",
    body: "Activities, awards, classes, college lists, and reflections live in one structured workspace. Add an entry the moment it happens — what you did, why it mattered, what changed — and senior year you'll have four years of evidence instead of four years of guessing.",
    accent: "#3F4A66",
  },
  {
    icon: Mic,
    eyebrow: "Voice sessions",
    title: "Talk through what's on your mind",
    body: "Open voice mode and think out loud the way you would with a counselor. Cultivr listens, asks the right follow-ups, and saves the moments you'd otherwise forget — the offhand sentence that becomes an essay opener, the worry that points to a real fit question.",
    accent: "#C97A5D",
  },
  {
    icon: Sparkles,
    eyebrow: "Readiness",
    title: "See where you stand",
    body: "Three rings — Explore, Distinguish, Reflect — show how balanced your profile actually is. Underneath, a weekly view turns reflection into action: the supplement to draft, the recommender to ask, the activity to log.",
    accent: "#E0B26B",
  },
];

const week = [
  {
    day: "Mon",
    tag: "Reflection",
    title: "Logged the robotics regional comeback",
    detail: "Two-minute voice memo. Saved as a seed for Common App essay #2.",
  },
  {
    day: "Wed",
    tag: "Voice",
    title: "Talked through Tufts vs. Brown for 14 minutes",
    detail: "Three follow-up questions queued for Mr. Alvarez. One essay opener saved.",
  },
  {
    day: "Thu",
    tag: "Activity",
    title: "Added AP Research hours · +12 this week",
    detail: "Microplastics project now tagged as Academic + Community.",
  },
  {
    day: "Fri",
    tag: "Plan",
    title: "Weekly review",
    detail: "Three actions for next week — supplement draft, ask Coach Liu, revise essay seed.",
  },
];

const expectations = [
  {
    title: "Less scrambling in October",
    body: "By the time supplements open, your activities are written, your stories are catalogued, and your essay seeds are ready to expand.",
  },
  {
    title: "Counseling time that goes further",
    body: "Counselors arrive to context, not catch-up. Sessions start with what's actually open instead of what you did three weeks ago.",
  },
  {
    title: "A profile that holds together",
    body: "The pieces — activities, awards, essays, college list — connect to a few clear themes instead of reading like a checklist.",
  },
];

export default function AboutPage() {
  return (
    <main
      className="min-h-[100dvh] overflow-x-hidden bg-[#ECE6E0] px-5 py-6 text-[#1F2433] md:px-10 md:py-7"
      style={{
        backgroundImage:
          "radial-gradient(rgba(31,36,51,0.18) 0.6px, transparent 0.6px), radial-gradient(rgba(31,36,51,0.18) 0.5px, transparent 0.5px)",
        backgroundPosition: "0 0, 7px 11px",
        backgroundSize: "14px 14px, 22px 22px",
      }}
    >
      <PublicNav />

      {/* HERO */}
      <section className="mx-auto grid w-full max-w-6xl gap-10 py-16 md:grid-cols-[1.05fr_0.95fr] md:py-24">
        <div>
          <p className="inline-flex items-center gap-3 font-mono text-xs uppercase tracking-[0.18em] text-[#1F2433]/60">
            <span className="size-1.5 animate-pulse rounded-full bg-[#C97A5D]" />
            About cultivr
          </p>
          <h1 className="mt-6 max-w-xl font-serif text-5xl leading-[0.95] text-[#1F2433] sm:text-6xl md:text-7xl">
            An <em className="text-[#C97A5D]">journal</em> for the college years.
          </h1>
          <p className="mt-6 max-w-md font-mono text-xs uppercase tracking-[0.14em] text-[#1F2433]/55">
            est. 2026 · made with counselors and students
          </p>
        </div>

        <div className="max-w-xl space-y-5 text-base leading-7 text-[#1F2433]/70">
          <p>
            College applications usually live in fifteen places at once. Essays
            in Google Docs. Deadlines in Common App. Activity lists in a
            spreadsheet that nobody updates. Reflections — the ones that
            actually become essays — locked in students&apos; heads.
          </p>
          <p>
            Cultivr is one quiet workspace where those pieces sit together.
            Students capture what&apos;s happening as it happens; the app organizes
            it into a profile they and their counselor can actually use; and
            when application season opens, the raw material is already there.
          </p>
        </div>
      </section>

      {/* DEFINITION CARD */}
      <section className="mx-auto w-full max-w-6xl pb-16">
        <div className="rounded-2xl border border-[#1F2433]/12 bg-[#F6F0E8]/70 p-8 md:p-12">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-[#1F2433]/55">
            cul·tiv·r &nbsp;/ˈkəltəvər/ &nbsp;noun
          </p>
          <p className="mt-4 font-serif text-2xl leading-relaxed text-[#1F2433] md:text-3xl">
            A workspace for the four-year stretch between curiosity and college
            — somewhere to log what you do, talk through what it means, and
            arrive at application season with{" "}
            <em className="text-[#3F4A66]">a record worth reading</em>.
          </p>
        </div>
      </section>

      {/* THREE PILLARS */}
      <section className="mx-auto w-full max-w-6xl pb-16">
        <div className="flex items-baseline justify-between border-b border-[#1F2433]/15 pb-5">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#1F2433]/60">
            How it works
          </p>
          <p className="hidden font-serif text-sm text-[#1F2433]/55 md:block">
            three habits, one workspace
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <article
                key={pillar.title}
                className="flex flex-col gap-4 rounded-2xl border border-[#1F2433]/10 bg-[#F6F0E8]/55 p-6"
              >
                <div
                  className="flex size-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: pillar.accent }}
                >
                  <Icon size={18} color="#ECE6E0" strokeWidth={1.7} />
                </div>
                <div>
                  <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[#1F2433]/55">
                    {pillar.eyebrow}
                  </p>
                  <h2 className="mt-1.5 font-serif text-2xl leading-tight text-[#1F2433]">
                    {pillar.title}
                  </h2>
                </div>
                <p className="text-sm leading-6 text-[#1F2433]/65">
                  {pillar.body}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* A WEEK IN THE JOURNAL */}
      <section className="mx-auto w-full max-w-6xl pb-16">
        <div className="grid gap-10 md:grid-cols-[0.85fr_1.15fr] md:gap-16">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#1F2433]/60">
              A week in the journal
            </p>
            <h2 className="mt-4 max-w-md font-serif text-4xl leading-[1.05] text-[#1F2433] md:text-5xl">
              Small entries.{" "}
              <em className="text-[#3F4A66]">Real outcomes.</em>
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-6 text-[#1F2433]/65">
              You don&apos;t need to write essays in November. You need to keep a
              record now, so November is just editing.
            </p>
          </div>

          <ol className="relative space-y-5 border-l border-[#1F2433]/15 pl-6">
            {week.map((entry) => (
              <li className="relative" key={entry.day}>
                <span className="absolute -left-[1.85rem] top-2 size-2.5 rounded-full border border-[#1F2433]/40 bg-[#ECE6E0]" />
                <div className="flex items-baseline gap-4">
                  <span className="font-serif text-xl text-[#1F2433]/55">
                    {entry.day}
                  </span>
                  <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[#C97A5D]">
                    {entry.tag}
                  </span>
                </div>
                <p className="mt-1 font-serif text-lg leading-snug text-[#1F2433]">
                  {entry.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-[#1F2433]/55">
                  {entry.detail}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* WHAT TO EXPECT */}
      <section className="mx-auto w-full max-w-6xl pb-16">
        <div className="flex items-baseline justify-between border-b border-[#1F2433]/15 pb-5">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#1F2433]/60">
            What you can expect
          </p>
        </div>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {expectations.map((item) => (
            <article key={item.title}>
              <h3 className="font-serif text-xl leading-snug text-[#1F2433]">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#1F2433]/65">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* CLOSING / CTA */}
      <section className="mx-auto w-full max-w-6xl pb-16">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-[#1F2433]/12 bg-[#1F2433] p-8 text-[#ECE6E0] md:flex-row md:items-center md:p-10">
          <div className="max-w-xl">
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-[#ECE6E0]/55">
              Start your journal
            </p>
            <h2 className="mt-3 font-serif text-3xl leading-tight md:text-4xl">
              The earliest entry is the best one.
            </h2>
          </div>
          <Link
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#ECE6E0] px-5 text-sm font-medium text-[#1F2433] transition hover:bg-white"
            href="/login"
          >
            Begin
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

    </main>
  );
}
