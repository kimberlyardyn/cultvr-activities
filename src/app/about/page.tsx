import { PublicNav } from "@/components/public-nav";

const principles = [
  {
    title: "Built around the student",
    body: "Activities, awards, essays, goals, and counselor notes stay connected so students can see the full shape of their application work.",
  },
  {
    title: "Clear counselor context",
    body: "Sessions can begin with recent progress, open questions, and next steps already organized instead of scattered across documents and email.",
  },
  {
    title: "Thoughtful support",
    body: "Cultivr helps students reflect, draft, and prepare while keeping professional guidance and student judgment at the center.",
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

      <section className="mx-auto grid w-full max-w-6xl gap-10 py-16 md:grid-cols-[0.9fr_1.1fr] md:py-24">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#1F2433]/60">
            About Cultivr
          </p>
          <h1 className="mt-5 max-w-xl font-serif text-4xl leading-none text-[#1F2433] sm:text-5xl md:text-6xl">
            A calmer way to organize the college process.
          </h1>
        </div>

        <div className="max-w-2xl text-base leading-7 text-[#1F2433]/68">
          <p>
            Cultivr gives students and counselors one structured place for the
            work that usually lives across notebooks, spreadsheets, shared
            folders, and email threads.
          </p>
          <p className="mt-5">
            The goal is straightforward: help students prepare with clarity,
            preserve the details that matter, and make each counseling
            conversation more useful.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 pb-16 md:grid-cols-3">
        {principles.map((principle) => (
          <article
            className="border-t border-[#1F2433]/15 bg-[#F6F0E8]/60 px-1 py-6"
            key={principle.title}
          >
            <h2 className="font-serif text-2xl text-[#1F2433]">
              {principle.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#1F2433]/65">
              {principle.body}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
