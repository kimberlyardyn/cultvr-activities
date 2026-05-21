import Link from "next/link";

import { PublicNav } from "@/components/public-nav";

const stories = [
  {
    title: "The activity story",
    body: "Turn roles, responsibilities, and impact into concise application-ready language that still sounds like the student.",
  },
  {
    title: "The reflection story",
    body: "Capture meaningful moments before they are forgotten, then shape them into useful starting points for essays and interviews.",
  },
  {
    title: "The planning story",
    body: "Keep recommendations, deadlines, counselor follow-ups, and open decisions visible as the application season moves forward.",
  },
];

export default function StoriesPage() {
  return (
    <main
      className="min-h-screen bg-[#ECE6E0] px-5 py-6 text-[#1F2433] md:px-10 md:py-7"
      style={{
        backgroundImage:
          "radial-gradient(rgba(31,36,51,0.18) 0.6px, transparent 0.6px), radial-gradient(rgba(31,36,51,0.18) 0.5px, transparent 0.5px)",
        backgroundPosition: "0 0, 7px 11px",
        backgroundSize: "14px 14px, 22px 22px",
      }}
    >
      <PublicNav />

      <section className="mx-auto w-full max-w-6xl py-16 md:py-24">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#1F2433]/60">
          Stories
        </p>
        <div className="mt-5 grid gap-8 md:grid-cols-[0.9fr_1.1fr]">
          <h1 className="max-w-xl font-serif text-5xl leading-none text-[#1F2433] md:text-6xl">
            Better context for stronger applications.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-[#1F2433]/68">
            Strong applications are built from specific experiences. Cultivr
            helps students collect, organize, and revisit those details before
            deadlines make the work rushed.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-5 pb-12">
        {stories.map((story, index) => (
          <article
            className="grid gap-4 border-t border-[#1F2433]/15 py-6 md:grid-cols-[8rem_1fr]"
            key={story.title}
          >
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#C97A5D]">
              0{index + 1}
            </span>
            <div>
              <h2 className="font-serif text-3xl text-[#1F2433]">
                {story.title}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#1F2433]/65">
                {story.body}
              </p>
            </div>
          </article>
        ))}
      </section>

      <section className="mx-auto flex w-full max-w-6xl justify-start pb-16">
        <Link
          className="inline-flex h-12 items-center justify-center rounded-full bg-[#1F2433] px-5 text-sm font-medium text-[#ECE6E0] transition hover:bg-[#0F1322]"
          href="/login"
        >
          Start workspace
        </Link>
      </section>
    </main>
  );
}
