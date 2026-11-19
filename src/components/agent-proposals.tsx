"use client";

import { Check, Loader2, X } from "lucide-react";

import { summarizeAction, TOOL_META, type AgentToolName } from "@/lib/agent/tools";

export type AgentProposal = {
  id: string;
  tool: AgentToolName;
  args: Record<string, unknown>;
  reason?: string;
};

/**
 * "Proposed actions · Awaiting approval" cards — shared by the Agent panel and
 * agent-powered Guided Sessions. Nothing runs until the student approves.
 * `busy` is the id being executed, "all" during Approve all, or null.
 */
export function ProposalCards({
  proposals,
  busy,
  compact = false,
  onApprove,
  onApproveAll,
  onDismiss,
}: {
  proposals: AgentProposal[];
  busy: string | null;
  compact?: boolean;
  onApprove: (proposal: AgentProposal) => void;
  onApproveAll: () => void;
  onDismiss: (proposal: AgentProposal) => void;
}) {
  if (!proposals.length) return null;

  return (
    <div className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-3.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
          Proposed actions · Awaiting approval
        </p>
        <span className="rounded-full bg-[#E0B26B]/30 px-2 py-0.5 text-[0.68rem] font-semibold text-[color:var(--almanac-ink)]">
          {proposals.length} pending
        </span>
      </div>

      <div className="mt-3 grid gap-2.5">
        {proposals.map((p) => (
          <div
            className="rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-3"
            key={p.id}
          >
            <div className={compact ? "grid gap-2" : "flex items-start justify-between gap-3"}>
              <div className="min-w-0">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--almanac-ink-soft)]">
                  {TOOL_META[p.tool].label}
                </p>
                <p className="mt-0.5 text-sm font-medium text-[color:var(--almanac-ink)]">
                  {summarizeAction(p.tool, p.args)}
                </p>
                {p.reason && (
                  <p className="mt-1 text-xs leading-5 text-[color:var(--almanac-ink-soft)]">{p.reason}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  className="inline-flex items-center gap-1 rounded-lg bg-[color:var(--almanac-ink)] px-2.5 py-1.5 text-xs font-medium text-[color:var(--almanac-paper)] transition hover:opacity-90 disabled:opacity-60"
                  disabled={busy !== null}
                  onClick={() => onApprove(p)}
                  type="button"
                >
                  {busy === p.id ? <Loader2 className="animate-spin" size={12} /> : <Check size={12} />}
                  {TOOL_META[p.tool].verb}
                </button>
                <button
                  aria-label="Dismiss"
                  className="rounded-lg p-1.5 text-[color:var(--almanac-ink-soft)] transition hover:bg-black/5 hover:text-[color:var(--almanac-ink)] disabled:opacity-60"
                  disabled={busy !== null}
                  onClick={() => onDismiss(p)}
                  type="button"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {proposals.length > 1 && (
        <button
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--almanac-rule)] px-3 py-1.5 text-xs font-medium text-[color:var(--almanac-ink)] transition hover:bg-black/[0.04] disabled:opacity-60"
          disabled={busy !== null}
          onClick={onApproveAll}
          type="button"
        >
          {busy === "all" ? <Loader2 className="animate-spin" size={12} /> : <Check size={12} />}
          Approve all
        </button>
      )}
    </div>
  );
}

/** Runs approved actions through the execute route. */
export async function executeAgentActions(actions: AgentProposal[]) {
  const res = await fetch("/api/agent/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      actions: actions.map((a) => ({ id: a.id, tool: a.tool, args: a.args, reason: a.reason })),
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Could not apply the action.");
  return data as {
    results: Array<{ id?: string; tool: string; ok: boolean; detail: string }>;
    logged: boolean;
  };
}

/** Records a dismissed proposal in the agent's execution log (best-effort). */
export function logDismissedProposal(proposal: AgentProposal) {
  void fetch("/api/agent/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "log_dismissed",
      tool: proposal.tool,
      args: proposal.args,
      reason: proposal.reason,
    }),
  }).catch(() => {});
}
