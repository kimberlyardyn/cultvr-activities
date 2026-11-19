"use client";

import { Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

import { AgentPanel } from "@/components/agent-panel";

/**
 * The agent is always present. On the Agent tab it fills the page; on every
 * other tab it lives in a floating dock. A single AgentPanel instance stays
 * mounted at the same tree position in both modes, so the conversation,
 * proposals and history carry across tabs.
 */
export function AgentSurface({ mode }: { mode: "page" | "dock" }) {
  const [open, setOpen] = useState(false);
  const [attention, setAttention] = useState(0);
  const docked = mode === "dock";

  useEffect(() => {
    if (!docked || !open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [docked, open]);

  return (
    <>
      {docked && !open ? (
        <button
          aria-label="Open Cultvr Agent"
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[color:var(--almanac-ink)] px-4 py-3 text-sm font-medium text-[color:var(--almanac-paper)] shadow-[0_12px_32px_rgba(31,36,51,0.28)] transition hover:opacity-95"
          onClick={() => setOpen(true)}
          type="button"
        >
          <Sparkles size={16} />
          Agent
          {attention > 0 && (
            <span className="ml-0.5 flex min-w-5 items-center justify-center rounded-full bg-[#E0B26B] px-1.5 text-[0.68rem] font-semibold text-[#1F2433]">
              {attention}
            </span>
          )}
        </button>
      ) : null}

      <div
        className={
          docked
            ? open
              ? "fixed inset-x-3 bottom-3 top-16 z-40 flex flex-col rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-4 shadow-[0_24px_60px_rgba(31,36,51,0.28)] sm:left-auto sm:right-5 sm:w-[27rem]"
              : "hidden"
            : ""
        }
        role={docked ? "dialog" : undefined}
        aria-label={docked ? "Cultvr Agent" : undefined}
      >
        {docked ? (
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 font-serif text-xl text-[color:var(--almanac-ink)]">
              <Sparkles size={16} />
              Cultvr Agent
            </p>
            <button
              aria-label="Close agent"
              className="rounded-full p-1.5 text-[color:var(--almanac-ink-soft)] transition hover:bg-black/5 hover:text-[color:var(--almanac-ink)]"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X size={16} />
            </button>
          </div>
        ) : null}
        <div className={docked ? "min-h-0 flex-1" : ""}>
          <AgentPanel active={!docked || open} compact={docked} onAttentionChange={setAttention} />
        </div>
      </div>
    </>
  );
}
