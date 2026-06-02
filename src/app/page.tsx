import Link from "next/link";

import { LandingPlant } from "@/components/landing-plant";
import { RevealText } from "@/components/reveal-text";

export default function Home() {
  return (
    <main
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#ECE6E0] px-5 text-[#1F2433]"
      style={{
        backgroundImage:
          "radial-gradient(rgba(31,36,51,0.18) 0.6px, transparent 0.6px), radial-gradient(rgba(31,36,51,0.18) 0.5px, transparent 0.5px)",
        backgroundPosition: "0 0, 7px 11px",
        backgroundSize: "14px 14px, 22px 22px",
      }}
    >
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Brand name */}
        <h1 className="font-serif text-6xl italic tracking-tight text-[#1F2433] sm:text-7xl md:text-8xl">
          Cultivr
          <span className="text-[#C97A5D]">.</span>
        </h1>

        {/* Branching mind-map tree */}
        <div className="relative mx-auto my-4 flex aspect-square w-full max-w-[14rem] items-center justify-center sm:my-6 sm:max-w-[17rem] md:max-w-[20rem]">
          <div className="absolute inset-[8%] rounded-full border border-dashed border-[#1F2433]/20" />
          <div className="absolute inset-[22%] rounded-full bg-[#DFD7CF]/60" />
          <LandingPlant />
        </div>

        {/* Animated tagline */}
        <div>
          <RevealText
            text="From Blank Page to Big Impact."
            className="font-serif text-2xl italic leading-relaxed tracking-wide text-[#1F2433]/85 sm:text-3xl md:text-4xl"
          />
        </div>

        {/* Sub-tagline */}
        <p className="mt-5 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em] text-[#1F2433]/45 sm:text-sm sm:tracking-[0.3em]">
          <span>Spark</span>
          <span className="text-[#C97A5D]/60">•</span>
          <span>Sharpen</span>
          <span className="text-[#C97A5D]/60">•</span>
          <span>Shine</span>
        </p>

        {/* CTA */}
        <Link
          className="group mt-10 inline-flex items-center gap-2 rounded-full bg-[#1F2433] px-8 py-3.5 text-sm font-medium tracking-wide text-[#ECE6E0] transition-all duration-300 hover:bg-[#0F1322] hover:shadow-lg sm:mt-12 sm:px-10 sm:py-4 sm:text-base"
          href="/login"
        >
          Begin Growth
          <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
            ›
          </span>
        </Link>

        {/* Sign in link */}
        <p className="mt-5 text-sm text-[#1F2433]/40">
          Already a member?{" "}
          <Link
            className="text-[#1F2433]/60 underline decoration-[#1F2433]/20 underline-offset-4 transition hover:text-[#1F2433] hover:decoration-[#1F2433]/40"
            href="/login"
          >
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
