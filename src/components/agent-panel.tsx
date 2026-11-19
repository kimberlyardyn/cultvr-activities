"use client";

import { Check, Loader2, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  summarizeAction,
  TOOL_META,
  type AgentToolName,
} from "@/lib/agent/tools";

type ChatMessage = { role: "user" | "agent"; text: string };
type Proposal = {
  id: string;
  tool: AgentToolName;
  args: Record<string, unknown>;
  reason?: string;
};
type LogEntry = { ok: boolean; detail: string };

const STARTERS = [
  "Review my workspace and tell me what to prioritize.",
  "What is the most important thing to do this week?",
  "Help me get organized for my next application.",
];

export function AgentPanel() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking, proposals.length]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || thinking) return;
      setError(null);
      const nextMessages: ChatMessage[] = [...messages, { role: "user", text: trimmed }];
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
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "The agent could not respond.");
        if (data.message) {
          setMessages((cur) => [...cur, { role: "agent", text: data.message as string }]);
        }
        if (Array.isArray(data.proposedActions) && data.proposedActions.length) {
          setProposals((cur) => [...cur, ...(data.proposedActions as Proposal[])]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setThinking(false);
      }
    },
    [messages, thinking],
  );

  const execute = useCallback(
    async (actions: Proposal[]) => {
      if (!actions.length) return;
      setError(null);
      setBusy(actions.length === 1 ? actions[0].id : "all");
      try {
        const res = await fetch("/api/agent/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actions: actions.map((a) => ({ id: a.id, tool: a.tool, args: a.args })),
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Could not apply the action.");
        const results: LogEntry[] = (data.results ?? []).map(
          (r: { ok: boolean; detail: string }) => ({ ok: r.ok, detail: r.detail }),
        );
        const doneIds = new Set(actions.map((a) => a.id));
        setProposals((cur) => cur.filter((p) => !doneIds.has(p.id)));
        setLog((cur) => [...results, ...cur].slice(0, 12));
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not apply the action.");
      } finally {
        setBusy(null);
      }
    },
    [router],
  );

  const dismiss = useCallback((id: string) => {
    setProposals((cur) => cur.filter((p) => p.id !== id));
  }, []);

  const empty = messages.length === 0 && proposals.length === 0;

  return (
    <section className="flex h-full min-h-[70vh] flex-col gap-4">
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

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-4"
      >
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
            <p className="max-w-sm text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
              Ask the agent to review your workspace, plan your next application, or find what needs
              attention. It will suggest concrete actions for you to approve.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTERS.map((s) => (
                <button
                  className="rounded-full border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] px-3 py-1.5 text-xs font-medium text-[color:var(--almanac-ink)] transition hover:bg-black/[0.04]"
                  key={s}
                  onClick={() => send(s)}
                  type="button"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
              key={i}
            >
              <p
                className={[
                  "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-6",
                  m.role === "user"
                    ? "bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]"
                    : "bg-[color:var(--almanac-paper)] text-[color:var(--almanac-ink)]",
                ].join(" ")}
              >
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

        {proposals.length > 0 && (
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
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--almanac-ink-soft)]">
                        {TOOL_META[p.tool].label}
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-[color:var(--almanac-ink)]">
                        {summarizeAction(p.tool, p.args)}
                      </p>
                      {p.reason && (
                        <p className="mt-1 text-xs leading-5 text-[color:var(--almanac-ink-soft)]">
                          {p.reason}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        className="inline-flex items-center gap-1 rounded-lg bg-[color:var(--almanac-ink)] px-2.5 py-1.5 text-xs font-medium text-[color:var(--almanac-paper)] transition hover:opacity-90 disabled:opacity-60"
                        disabled={busy !== null}
                        onClick={() => execute([p])}
                        type="button"
                      >
                        {busy === p.id ? (
                          <Loader2 className="animate-spin" size={12} />
                        ) : (
                          <Check size={12} />
                        )}
                        {TOOL_META[p.tool].verb}
                      </button>
                      <button
                        aria-label="Dismiss"
                        className="rounded-lg p-1.5 text-[color:var(--almanac-ink-soft)] transition hover:bg-black/5 hover:text-[color:var(--almanac-ink)] disabled:opacity-60"
                        disabled={busy !== null}
                        onClick={() => dismiss(p.id)}
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
                onClick={() => execute(proposals)}
                type="button"
              >
                {busy === "all" ? <Loader2 className="animate-spin" size={12} /> : <Check size={12} />}
                Approve all
              </button>
            )}
          </div>
        )}

        {log.length > 0 && (
          <div className="grid gap-1 pt-1">
            {log.map((entry, i) => (
              <p
                className="flex items-center gap-1.5 text-xs text-[color:var(--almanac-ink-soft)]"
                key={i}
              >
                <Check
                  className={entry.ok ? "text-[#6f9e6f]" : "text-[#c4697a]"}
                  size={12}
                />
                {entry.detail}
              </p>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-[#c4697a]">{error}</p>}

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <textarea
          className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] px-3.5 py-2.5 text-sm text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[color:var(--almanac-olive)]"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Ask the agent to review, plan, or organize…"
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
