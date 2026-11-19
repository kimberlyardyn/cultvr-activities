"use client";

import {
  AlertCircle,
  Check,
  Lightbulb,
  Loader2,
  Mic,
  MinusCircle,
  RotateCcw,
  Search,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  isAgentToolName,
  summarizeAction,
  TOOL_META,
  type AgentToolName,
} from "@/lib/agent/tools";
import { ProposalCards } from "@/components/agent-proposals";
import { useVoiceConversation, type VoicePhase } from "@/components/use-voice-conversation";

type ChatMessage = { role: "user" | "agent"; text: string; trace?: string[]; spoken?: boolean };

const VOICE_LABELS: Record<Exclude<VoicePhase, "off">, string> = {
  listening: "Listening… go ahead",
  hearing: "Hearing you…",
  thinking: "Thinking…",
  speaking: "Speaking",
};
type Proposal = {
  id: string;
  tool: AgentToolName;
  args: Record<string, unknown>;
  reason?: string;
};
export type AgentInsight = {
  id: string;
  kind: string;
  title: string;
  detail: string | null;
  prompt: string | null;
};
export type AgentLogItem = {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  reason?: string | null;
  status: "executed" | "failed" | "dismissed";
  result: string | null;
  created_at: string;
};

const STARTERS = [
  "Review my workspace and tell me what to prioritize.",
  "What is the most important thing to do this week?",
  "Help me get organized for my next application.",
];

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(minutes) || minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function AgentPanel({
  initialMessages = [],
  initialProposals = [],
  initialInsights = [],
  initialLog = [],
  compact = false,
  preview = false,
  active = true,
  onAttentionChange,
}: {
  /** False while the panel is hidden (e.g. dock closed) — ends voice mode. */
  active?: boolean;
  initialMessages?: ChatMessage[];
  initialProposals?: Proposal[];
  initialInsights?: AgentInsight[];
  initialLog?: AgentLogItem[];
  /** Tighter layout for the floating dock. */
  compact?: boolean;
  /** Static preview: skip network calls. */
  preview?: boolean;
  /** Reports how many items need the student's attention (dock badge). */
  onAttentionChange?: (count: number) => void;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>(initialProposals);
  const [insights, setInsights] = useState<AgentInsight[]>(initialInsights);
  const [history, setHistory] = useState<AgentLogItem[]>(initialLog);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadState = useCallback(async () => {
    if (preview) return;
    try {
      const res = await fetch("/api/agent/state", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setInsights(Array.isArray(data.insights) ? data.insights : []);
      setHistory(Array.isArray(data.log) ? data.log : []);
      setSetupNeeded(Boolean(data.setupNeeded));
    } catch {
      // Non-critical: the agent still works without insights/history.
    }
  }, [preview]);

  useEffect(() => {
    // Initial fetch of insights + execution log from the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadState();
  }, [loadState]);

  useEffect(() => {
    onAttentionChange?.(insights.length + proposals.length);
  }, [insights.length, proposals.length, onAttentionChange]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking, proposals.length]);

  const send = useCallback(
    async (text: string, opts?: { voice?: boolean }): Promise<string | null> => {
      const trimmed = text.trim();
      if (!trimmed || thinking || preview) return null;
      setError(null);
      const nextMessages: ChatMessage[] = [
        ...messages,
        { role: "user", text: trimmed, spoken: opts?.voice },
      ];
      setMessages(nextMessages);
      setInput("");
      setThinking(true);
      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages.map((m) => ({
              role: m.role === "agent" ? "assistant" : "user",
              content: m.text,
            })),
            voice: Boolean(opts?.voice),
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "The agent could not respond.");
        setMessages((cur) => [
          ...cur,
          {
            role: "agent",
            text: (data.message as string) || "",
            trace: Array.isArray(data.trace) ? (data.trace as string[]) : undefined,
          },
        ]);
        const incoming = Array.isArray(data.proposedActions)
          ? (data.proposedActions as Array<Proposal & { tool: string }>).filter((p) =>
              isAgentToolName(p.tool),
            )
          : [];
        if (incoming.length) setProposals((cur) => [...cur, ...incoming]);
        return (data.message as string) || null;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
        return null;
      } finally {
        setThinking(false);
      }
    },
    [messages, thinking, preview],
  );

  const voice = useVoiceConversation({ onUtterance: (text) => send(text, { voice: true }) });
  const stopVoice = voice.stop;
  const voiceOn = voice.phase !== "off";

  useEffect(() => {
    // Hiding the agent (e.g. closing the dock) ends any voice conversation.
    if (!active) stopVoice();
  }, [active, stopVoice]);

  const execute = useCallback(
    async (actions: Proposal[], busyKey: string) => {
      if (!actions.length || preview) return;
      setError(null);
      setBusy(busyKey);
      try {
        const res = await fetch("/api/agent/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actions: actions.map((a) => ({
              id: a.id,
              tool: a.tool,
              args: a.args,
              reason: a.reason,
            })),
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Could not apply the action.");
        const doneIds = new Set(actions.map((a) => a.id));
        setProposals((cur) => cur.filter((p) => !doneIds.has(p.id)));
        if (data.logged) {
          await loadState();
        } else {
          // No server log yet (schema not migrated) — keep a local one.
          const results = (data.results ?? []) as Array<{ tool: string; ok: boolean; detail: string }>;
          const now = new Date().toISOString();
          setHistory((cur) =>
            [
              ...results.map((r, i) => ({
                id: `local-${Date.now()}-${i}`,
                tool: r.tool,
                args: actions[i]?.args ?? {},
                reason: actions[i]?.reason,
                status: (r.ok ? "executed" : "failed") as AgentLogItem["status"],
                result: r.detail,
                created_at: now,
              })),
              ...cur,
            ].slice(0, 10),
          );
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not apply the action.");
      } finally {
        setBusy(null);
      }
    },
    [router, loadState, preview],
  );

  const dismissProposal = useCallback(
    (proposal: Proposal) => {
      setProposals((cur) => cur.filter((p) => p.id !== proposal.id));
      setHistory((cur) =>
        [
          {
            id: `local-dismiss-${proposal.id}`,
            tool: proposal.tool,
            args: proposal.args,
            reason: proposal.reason,
            status: "dismissed" as const,
            result: "Dismissed by student",
            created_at: new Date().toISOString(),
          },
          ...cur,
        ].slice(0, 10),
      );
      if (preview) return;
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
    },
    [preview],
  );

  const dismissInsight = useCallback(
    (id: string) => {
      setInsights((cur) => cur.filter((i) => i.id !== id));
      if (preview) return;
      void fetch("/api/agent/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss_insight", id }),
      }).catch(() => {});
    },
    [preview],
  );

  const fresh = messages.length === 0 && proposals.length === 0;

  return (
    <section className={["flex h-full flex-col gap-3", compact ? "" : "min-h-[70vh]"].join(" ")}>
      {!compact && (
        <header className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]">
            <Sparkles size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="font-serif text-2xl leading-tight text-[color:var(--almanac-ink)]">
              Cultvr Agent
            </h2>
            <p className="mt-0.5 text-sm text-[color:var(--almanac-ink-soft)]">
              Reviews your workspace and proposes next steps. You approve before anything is saved.
            </p>
          </div>
        </header>
      )}

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-4"
      >
        {fresh && insights.length > 0 && (
          <div className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-3.5">
            <p className="flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
              <Lightbulb size={12} />
              Since you were last here
            </p>
            <div className="mt-2.5 grid gap-2">
              {insights.map((insight) => (
                <div
                  className="flex items-start justify-between gap-3 rounded-xl bg-[color:var(--almanac-paper-deep)] px-3 py-2.5"
                  key={insight.id}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[color:var(--almanac-ink)]">{insight.title}</p>
                    {insight.detail && (
                      <p className="mt-0.5 text-xs leading-5 text-[color:var(--almanac-ink-soft)]">
                        {insight.detail}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {insight.prompt && (
                      <button
                        className="rounded-lg border border-[color:var(--almanac-rule)] px-2.5 py-1 text-xs font-medium text-[color:var(--almanac-ink)] transition hover:bg-black/[0.04]"
                        onClick={() => send(insight.prompt ?? "")}
                        type="button"
                      >
                        Work on this
                      </button>
                    )}
                    <button
                      aria-label="Dismiss insight"
                      className="rounded-lg p-1 text-[color:var(--almanac-ink-soft)] transition hover:bg-black/5"
                      onClick={() => dismissInsight(insight.id)}
                      type="button"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {fresh ? (
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <p className="max-w-sm text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
              What is on your mind today? Ask the agent to review your workspace, plan your next
              application, or find what needs attention. It will suggest concrete actions for you to
              approve.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTERS.map((starter) => (
                <button
                  className="rounded-full border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] px-3 py-1.5 text-xs font-medium text-[color:var(--almanac-ink)] transition hover:bg-black/[0.04]"
                  key={starter}
                  onClick={() => send(starter)}
                  type="button"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div className={m.role === "user" ? "flex justify-end" : "flex flex-col items-start gap-1"} key={i}>
              {m.role === "agent" && m.trace?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {m.trace.map((step, j) => (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2 py-0.5 text-[0.68rem] text-[color:var(--almanac-ink-soft)]"
                      key={j}
                    >
                      <Search size={10} />
                      {step}
                    </span>
                  ))}
                </div>
              ) : null}
              <p
                className={[
                  "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-6",
                  m.role === "user"
                    ? "bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]"
                    : "bg-[color:var(--almanac-paper)] text-[color:var(--almanac-ink)]",
                ].join(" ")}
              >
                {m.spoken && <Mic aria-label="Spoken" className="-mt-0.5 mr-1.5 inline opacity-70" size={12} />}
                {m.text}
              </p>
            </div>
          ))
        )}

        {thinking && (
          <div className="flex items-center gap-2 text-sm text-[color:var(--almanac-ink-soft)]">
            <Loader2 className="animate-spin" size={14} />
            Reviewing your workspace…
          </div>
        )}

        <ProposalCards
          busy={busy}
          compact={compact}
          onApprove={(p) => execute([p], p.id)}
          onApproveAll={() => execute(proposals, "all")}
          onDismiss={dismissProposal}
          proposals={proposals}
        />

        {history.length > 0 && (
          <div className="pt-1">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
              Recent agent activity
            </p>
            <div className="mt-1.5 grid gap-1">
              {history.slice(0, compact ? 4 : 8).map((item) => {
                const known = isAgentToolName(item.tool);
                const label = known ? TOOL_META[item.tool as AgentToolName].label : item.tool;
                const text =
                  item.status === "dismissed" && known
                    ? `Dismissed: ${summarizeAction(item.tool as AgentToolName, item.args)}`
                    : item.result || label;
                return (
                  <div className="flex items-center gap-1.5 text-xs text-[color:var(--almanac-ink-soft)]" key={item.id}>
                    {item.status === "executed" ? (
                      <Check className="shrink-0 text-[#6f9e6f]" size={12} />
                    ) : item.status === "failed" ? (
                      <AlertCircle className="shrink-0 text-[#c4697a]" size={12} />
                    ) : (
                      <MinusCircle className="shrink-0 opacity-60" size={12} />
                    )}
                    <span className="min-w-0 flex-1 truncate">{text}</span>
                    <span className="shrink-0 opacity-70">{timeAgo(item.created_at)}</span>
                    {item.status === "failed" && known && (
                      <button
                        className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-[color:var(--almanac-ink)] transition hover:bg-black/5 disabled:opacity-60"
                        disabled={busy !== null}
                        onClick={() =>
                          execute(
                            [
                              {
                                id: `retry-${item.id}`,
                                tool: item.tool as AgentToolName,
                                args: item.args,
                                reason: item.reason ?? undefined,
                              },
                            ],
                            `retry-${item.id}`,
                          )
                        }
                        type="button"
                      >
                        <RotateCcw size={11} />
                        Retry
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {setupNeeded && (
        <p className="text-[0.7rem] text-[color:var(--almanac-ink-soft)]">
          Agent history and insights turn on once the latest database schema is applied.
        </p>
      )}
      {error && <p className="text-xs text-[#c4697a]">{error}</p>}
      {voice.notice && !voiceOn && (
        <p className="text-xs text-[color:var(--almanac-ink-soft)]">{voice.notice}</p>
      )}

      {voiceOn && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] px-3 py-2 text-xs text-[color:var(--almanac-ink)]">
          <span className="flex items-center gap-2">
            <span
              className={[
                "size-2 rounded-full",
                voice.phase === "listening" || voice.phase === "hearing"
                  ? "bg-[#c4697a]"
                  : "bg-[color:var(--almanac-ink-soft)]",
                voice.phase === "hearing" || voice.phase === "speaking" ? "animate-pulse" : "",
              ].join(" ")}
            />
            {voice.phase === "off" ? "" : VOICE_LABELS[voice.phase]}
          </span>
          <span className="flex items-center gap-1">
            {(voice.phase === "listening" || voice.phase === "hearing") && (
              <button
                className="rounded-md px-2 py-1 font-medium transition hover:bg-black/5"
                onClick={voice.finishTurn}
                type="button"
              >
                Done talking
              </button>
            )}
            {voice.phase === "speaking" && (
              <button
                className="rounded-md px-2 py-1 font-medium transition hover:bg-black/5"
                onClick={voice.interrupt}
                type="button"
              >
                Interrupt
              </button>
            )}
          </span>
        </div>
      )}

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        {!preview && (
          <button
            aria-label={voiceOn ? "End voice conversation" : "Talk to the agent"}
            className={[
              "inline-flex size-11 shrink-0 items-center justify-center rounded-xl border transition",
              voiceOn
                ? "border-transparent bg-[#c4697a] text-white hover:opacity-90"
                : "border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] text-[color:var(--almanac-ink)] hover:bg-black/[0.04]",
            ].join(" ")}
            onClick={voiceOn ? stopVoice : () => void voice.start()}
            title={voiceOn ? "End voice conversation" : "Talk to the agent"}
            type="button"
          >
            {voiceOn ? <Square size={14} /> : <Mic size={17} />}
          </button>
        )}
        <textarea
          className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] px-3.5 py-2.5 text-sm text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[color:var(--almanac-olive)]"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="What is on your mind today?"
          rows={1}
          value={input}
        />
        <button
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-[color:var(--almanac-ink)] px-4 text-sm font-medium text-[color:var(--almanac-paper)] transition hover:opacity-90 disabled:opacity-60"
          disabled={thinking || !input.trim()}
          type="submit"
        >
          {thinking ? <Loader2 className="animate-spin" size={15} /> : <Sparkles size={15} />}
          Send
        </button>
      </form>
    </section>
  );
}
