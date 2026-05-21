import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { LandingPlant } from "@/components/landing-plant";
import { PublicNav } from "@/components/public-nav";

export default function Home() {
  return (
    <main
      className="grid min-h-screen overflow-hidden bg-[#ECE6E0] px-5 py-6 text-[#1F2433] md:px-10 md:py-7"
      style={{
        backgroundImage:
          "radial-gradient(rgba(31,36,51,0.18) 0.6px, transparent 0.6px), radial-gradient(rgba(31,36,51,0.18) 0.5px, transparent 0.5px)",
        backgroundPosition: "0 0, 7px 11px",
        backgroundSize: "14px 14px, 22px 22px",
        gridTemplateRows: "auto 1fr auto",
      }}
    >
      <PublicNav />

      <section className="mx-auto grid w-full max-w-7xl items-center gap-8 py-10 md:grid-cols-[1.05fr_0.95fr] md:gap-14 md:px-5 md:py-0">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-3 font-mono text-xs uppercase tracking-[0.18em] text-[#1F2433]/60">
            <span className="size-1.5 animate-pulse rounded-full bg-[#C97A5D]" />
            College counseling workspace
          </p>
          <h1 className="mt-6 font-serif text-6xl leading-none text-[#1F2433] md:text-7xl lg:text-8xl">
            Clear planning.
            <br />
            Stronger{" "}
            <em className="italic text-[#3F4A66]">applications</em>.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-[#1F2433]/65">
            Cultivr helps students and counselors keep activities, awards,
            essays, goals, and follow-ups organized in one calm workspace.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#1F2433] px-5 text-sm font-medium text-[#ECE6E0] transition hover:bg-[#0F1322]"
              href="/login"
            >
              Start workspace
              <ArrowRight size={16} />
            </Link>
            <Link
              className="inline-flex h-12 items-center justify-center rounded-full border border-[#1F2433]/10 px-5 text-sm font-medium text-[#1F2433] transition hover:bg-[#1F2433]/5"
              href="/about"
            >
              Learn more
            </Link>
          </div>
        </div>

        <div className="relative mx-auto flex aspect-square w-full max-w-[31rem] items-center justify-center">
          <div className="absolute inset-[8%] rounded-full border border-dashed border-[#1F2433]/20" />
          <div className="absolute inset-[22%] rounded-full bg-[#DFD7CF]/60" />
          <LandingPlant />
        </div>
      </section>

      <footer className="border-t border-[#1F2433]/10 pt-4 font-mono text-xs uppercase tracking-[0.14em] text-[#1F2433]/60">
        <div className="flex items-center gap-5">
          <span>made for students</span>
          <span className="h-px flex-1 bg-[#1F2433]/10" />
        </div>
      </footer>
    </main>
  );
}
