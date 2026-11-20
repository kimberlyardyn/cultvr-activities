"use client";

import { Check, ChevronDown, Loader2, X } from "lucide-react";
import { useState } from "react";

import { summarizeAction, TOOL_META, type AgentToolName } from "@/lib/agent/tools";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function prettyDate(value: string) {
  if (!/^\d{4}-\d{2}(-\d{2})?$/.test(value)) return value;
  const d = new Date(value.length === 7 ? `${value}-01T00:00` : `${value}T00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en", {
    month: "short",
    ...(value.length === 7 ? {} : { day: "numeric" }),
    year: "numeric",
  });
}

/** Everything a proposal would write, so the student can check it first. */
function detailRows(tool: AgentToolName, args: Record<string, unknown>) {
  const rows: Array<{ label: string; value: string; long?: boolean }> = [];
  const add = (label: string, value: string, long = false) => {
    if (value) rows.push({ label, value, long });
  };
  switch (tool) {
    case "create_goal":
      add("Goal", text(args.title));
      add("Target date", prettyDate(text(args.target_date)));
      break;
    case "create_task":
      add("Task", text(args.title));
      add("Due", prettyDate(text(args.due_date)));
      break;
    case "update_activity":
      add("Activity", text(args.activity_name));
      add("New impact statement", text(args.impact), true);
      add("New description", text(args.description), true);
      break;
    case "add_college":
      add("College", text(args.name));
      add("Location", text(args.location));
      add("List", text(args.status) || "Dream");
      add("Why it fits", text(args.fit_reason), true);
      break;
    case "create_note":
      add("Title", text(args.title));
      add("Category", text(args.category) || "Reflection");
      add("Note", text(args.body), true);
      break;
  }
  return rows;
}

function ProposalDetails({ tool, args }: { tool: AgentToolName; args: Record<string, unknown> }) {
  const rows = detailRows(tool, args);
  return (
    <dl className="mt-2.5 grid gap-2 rounded-lg border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-3">
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--almanac-ink-soft)]">
            {row.label}
          </dt>
          <dd
            className={[
              "mt-0.5 text-sm text-[color:var(--almanac-ink)]",
              row.long ? "whitespace-pre-wrap leading-6" : "",
            ].join(" ")}
          >
            {row.long
              ? row.value.replace(/^\s*[-*] \[[xX]\] /gm, "☑ ").replace(/^\s*[-*] \[ \] /gm, "☐ ")
              : row.value}
          </dd>
        </div>
      ))}
      <p className="text-[0.68rem] text-[color:var(--almanac-ink-soft)]">
        This is exactly what will be saved if you approve.
      </p>
    </dl>
  );
}

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
  const [open, setOpen] = useState<Set<string>>(new Set());
  if (!proposals.length) return null;

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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
                <button
                  aria-expanded={open.has(p.id)}
                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-[color:var(--almanac-ink)] underline-offset-2 hover:underline"
                  onClick={() => toggle(p.id)}
                  type="button"
                >
                  <ChevronDown
                    className={`transition-transform ${open.has(p.id) ? "rotate-180" : ""}`}
                    size={12}
                  />
                  {open.has(p.id) ? "Hide preview" : "Preview"}
                </button>
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
            {open.has(p.id) && <ProposalDetails args={p.args} tool={p.tool} />}
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
