"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import { createGuidedSessionArtifacts } from "@/app/dashboard/actions";
import { toast } from "@/components/toast";
import { VoicePanel } from "@/components/voice-panel";
import type { Activity, Award, Note } from "@/lib/types";

// Each session has a single warm `opener` (the coach's first question) and at
// most 2 sharply distinct `prompts` that surface as progressive-disclosure
// chips ("Not sure where to start?"). One chip should tilt experiential
// (energy / joy / memory), the other analytical (impact / next step / proof) —
// so picking either one meaningfully reframes the conversation.
const sessionTypes = [
  {
    id: "general-brainstorm",
    label: "General Brainstorm",
    focus: "Open-ended exploration to surface ideas worth pursuing.",
    opener: "What's been on your mind lately?",
    prompts: [
      "What's something you've wanted to try but haven't yet?",
      "If nothing were holding you back, what would you start this month?",
    ],
  },
  {
    id: "new-activity",
    label: "New Activity",
    focus:
      "Capture a new activity you've started — or explore one you'd like to start — and shape it into a strong entry.",
    opener: "What kind of new activity are you drawn to right now?",
    prompts: [
      "Something tied to your major, a leadership role, social impact, or pure interest — which feels closest?",
      "How much time do you realistically have each week for something new?",
    ],
  },
  {
    id: "deepen-activity",
    label: "Deepen Current Activity",
    focus: "Move an existing activity from participation to measurable impact.",
    // Opener is dynamically replaced with the chosen activity's name in the parent.
    opener: "Which activity do you want to deepen?",
    prompts: [
      "What's the most measurable change you've made in this activity?",
      "Where could this go in the next six months?",
    ],
  },
  {
    id: "achievement-reflection",
    label: "Achievement Reflection",
    focus: "Find the proof points and meaning inside a win.",
    opener: "Tell me about a win you're proud of.",
    prompts: [
      "What made this matter to you personally?",
      "What changed because of it — any numbers you can put to it?",
    ],
  },
  {
    id: "challenge-reflection",
    label: "Challenge Reflection",
    focus: "Frame a setback or difficulty with agency and growth.",
    opener: "What's a challenge that's been weighing on you?",
    prompts: [
      "What choice did you make in the middle of it?",
      "What's different about how you think or work now because of it?",
    ],
  },
  {
    id: "academic-exploration",
    label: "Academic Exploration",
    focus: "Connect academic interests to evidence and next steps.",
    opener: "What subject or problem keeps pulling your attention?",
    prompts: [
      "What experience proves this interest is real?",
      "What's one thing you'd want to learn or try next academically?",
    ],
  },
  {
    id: "career-exploration",
    label: "Career Exploration",
    focus: "Explore career directions and what they require.",
    opener: "What kind of work are you curious about lately?",
    prompts: [
      "What draws you to it — the day-to-day, the impact, or the people?",
      "What's one small way you could test or learn more about that path?",
    ],
  },
  {
    id: "goal-setting",
    label: "Goal Setting",
    focus: "Turn intentions into concrete, trackable goals.",
    opener: "What's one thing you want to make real?",
    prompts: [
      "What's the smallest first step you could take this week?",
      "How will you know you're making progress?",
    ],
  },
  {
    id: "narrative-mining",
    label: "Narrative Mining",
    focus: "Find the personal stories that can carry an essay.",
    opener: "Tell me about a moment you still remember clearly.",
    prompts: [
      "What did it reveal about your values or how you think?",
      "What would a reader learn about you that isn't obvious elsewhere?",
    ],
  },
  {
    id: "interview-prep",
    label: "Interview Prep",
    focus: "Prepare clear, memorable stories for interviews.",
    opener: "What's the one thing you want an interviewer to remember about you?",
    prompts: [
      "Which experience best shows that quality?",
      "What's a question you'd actually want to ask them?",
    ],
  },
] as const;

type SessionId = (typeof sessionTypes)[number]["id"];
type Session = (typeof sessionTypes)[number];
type GuidedPanel = "live" | "history";
type ChatMessage = { role: "user" | "assistant"; content: string };

const ACTION_PLAN_WINDOWS = [
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "1year", label: "1 Year" },
  { id: "longterm", label: "Long-term" },
] as const;
type ActionPlanWindowId = (typeof ACTION_PLAN_WINDOWS)[number]["id"];

export function GuidedSessionsView({
  activities,
  awards,
  notes,
}: {
  activities: Activity[];
  awards: Award[];
  notes: Note[];
}) {
  const [selectedId, setSelectedId] = useState<SessionId>(sessionTypes[0].id);
  const [panel, setPanel] = useState<GuidedPanel>("live");
  const [mode, setMode] = useState<"live" | "review">("live");
  const [interactionMode, setInteractionMode] = useState<"voice" | "text">("voice");
  const [transcript, setTranscript] = useState("");
  const [typedEntry, setTypedEntry] = useState("");
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSuggestions, setChatSuggestions] = useState<string[]>([]);
  const [actionPlanWindow, setActionPlanWindow] = useState<ActionPlanWindowId | "none">("none");
  const [linkedActivityIds, setLinkedActivityIds] = useState<Set<string>>(new Set());
  const [linkedAwardIds, setLinkedAwardIds] = useState<Set<string>>(new Set());
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Handoff from the Activities list "Deepen this activity" link: if an id was
  // stashed, open the Deepen Current Activity session with it pre-selected.
  useEffect(() => {
    let stashed: string | null = null;
    try {
      stashed = sessionStorage.getItem("cultvr-deepen-activity-id");
      if (stashed) sessionStorage.removeItem("cultvr-deepen-activity-id");
    } catch {
      stashed = null;
    }
    if (!stashed || !activities.some((a) => a.id === stashed)) return;
    setSelectedId("deepen-activity");
    setSelectedActivityId(stashed);
    setPanel("live");
    setMode("live");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warn the user if they try to close/refresh the tab with an unsaved session.
  useEffect(() => {
    const dirty =
      mode === "live" && saveState !== "saved" && transcript.trim().length > 0;
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [mode, saveState, transcript]);

  // Warn before leaving the page (refresh / close / nav) with an unsaved session.
  useEffect(() => {
    function handler(event: BeforeUnloadEvent) {
      if (mode === "live" && saveState !== "saved" && transcript.trim()) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [mode, saveState, transcript]);

  const selected = sessionTypes.find((item) => item.id === selectedId) ?? sessionTypes[0];
  const sessionNotes = notes.filter((note) => note.category.startsWith("Guided:"));
  const answers: Record<string, string> = {};
  const generatedNoteTitle = `${selected.label}: ${shortDate(new Date().toISOString())}`;
  const [draftNoteTitle, setDraftNoteTitle] = useState<string>(generatedNoteTitle);
  const [draftNoteBody, setDraftNoteBody] = useState<string>(
    buildSessionSummary(selected, answers, transcript),
  );

  // "Deepen Current Activity" requires choosing an activity before the session.
  const needsActivity = selected.id === "deepen-activity";
  const chosenActivity = activities.find((a) => a.id === selectedActivityId) ?? null;
  const activityReady = !needsActivity || Boolean(chosenActivity);
  const deepenContext = chosenActivity
    ? [
        `Activity: ${chosenActivity.name}`,
        chosenActivity.role ? `Role: ${chosenActivity.role}` : "",
        chosenActivity.impact ? `Current description: ${chosenActivity.impact}` : "",
      ]
        .filter(Boolean)
        .join(". ")
    : "";
  const effectiveFocus = (
    needsActivity && chosenActivity ? `${selected.focus} ${deepenContext}.` : selected.focus
  ).slice(0, 590);
  // One warm, single-question opener for both voice and text. The deepen
  // session weaves in the chosen activity name so the question is personalized.
  const opener =
    needsActivity && chosenActivity
      ? `What part of ${chosenActivity.name} feels most alive for you right now?`
      : selected.opener;
  const voiceOpener = opener;
  const textOpener = opener;

  function appendVoiceTranscript(entry: string) {
    const cleaned = entry.trim();
    if (!cleaned) return;
    setTranscript((current) => {
      const next = current ? `${current}\nStudent: ${cleaned}` : `Student: ${cleaned}`;
      setDraftNoteBody(buildSessionSummary(selected, answers, next));
      return next;
    });
  }

  async function sendChat(rawText: string) {
    const text = rawText.trim();
    if (!text || chatLoading) return;

    const history: ChatMessage[] = [...chatMessages, { role: "user", content: text }];
    setChatMessages(history);
    setTypedEntry("");
    setChatSuggestions([]);
    setChatLoading(true);
    setTranscript((current) => {
      const next = current ? `${current}\nStudent: ${text}` : `Student: ${text}`;
      setDraftNoteBody(buildSessionSummary(selected, answers, next));
      return next;
    });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          sessionType: selected.label,
          sessionFocus: effectiveFocus,
        }),
      });
      const data = (await res.json()) as { message?: string };
      const reply =
        data.message?.trim() ||
        "I'm having trouble responding right now — tell me a bit more.";
      setChatMessages((current) => [...current, { role: "assistant", content: reply }]);
      setTranscript((current) => {
        const next = current ? `${current}\nCoach: ${reply}` : `Coach: ${reply}`;
        setDraftNoteBody(buildSessionSummary(selected, answers, next));
        return next;
      });
    } catch (error) {
      console.error("Chat send failed:", error);
      setChatMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "I couldn't reach the AI service just now. Try again in a moment.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  function goToReview() {
    setDraftNoteTitle(`${selected.label}: ${shortDate(new Date().toISOString())}`);
    setDraftNoteBody(buildSessionSummary(selected, answers, transcript));
    setSaveState("idle");
    setSaveError(null);
    setMode("review");
  }

  function goBackToSession() {
    setMode("live");
  }

  function clearChat() {
    setChatMessages([]);
    setChatSuggestions([]);
    setTranscript("");
    setTypedEntry("");
    setDraftNoteBody(buildSessionSummary(selected, answers, ""));
  }

  /**
   * A sample-question chip represents the coach asking the student that
   * question — not the student asking it of the coach. So clicking a chip
   * pushes the question into the chat as an assistant message and waits for
   * the student to reply.
   */
  function pickStarter(text: string) {
    const cleaned = text.trim();
    if (!cleaned) return;
    setChatMessages((current) => [...current, { role: "assistant", content: cleaned }]);
    setChatSuggestions([]);
    setTranscript((current) => {
      const next = current ? `${current}\nCoach: ${cleaned}` : `Coach: ${cleaned}`;
      setDraftNoteBody(buildSessionSummary(selected, answers, next));
      return next;
    });
  }

  function hasUnsavedWork() {
    return mode === "live" && saveState !== "saved" && transcript.trim().length > 0;
  }

  function confirmIfDirty(action: () => void) {
    if (!hasUnsavedWork()) {
      action();
      return;
    }
    const choice = window.confirm(
      "You have an unsaved session. Discard it and continue?",
    );
    if (choice) action();
  }

  async function handleSaveSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveState === "saving") return;
    if (!transcript.trim() || !draftNoteTitle.trim() || !draftNoteBody.trim()) return;

    const linkedActivities = activities.filter((a) => linkedActivityIds.has(a.id));
    const linkedAwards = awards.filter((a) => linkedAwardIds.has(a.id));
    const linkLines: string[] = [];
    if (linkedActivities.length) {
      linkLines.push(`Linked activities: ${linkedActivities.map((a) => a.name).join(", ")}`);
    }
    if (linkedAwards.length) {
      linkLines.push(`Linked awards: ${linkedAwards.map((a) => a.name).join(", ")}`);
    }
    const finalBody = linkLines.length
      ? `${draftNoteBody}\n\n${linkLines.join("\n")}`
      : draftNoteBody;

    const fd = new FormData();
    fd.set("session_type", selected.label);
    fd.set("session_label", selected.label);
    fd.set("session_focus", effectiveFocus);
    fd.set("interaction_mode", interactionMode === "voice" ? "voice" : "chat");
    fd.set("transcript", transcript);
    fd.set("note_title", draftNoteTitle);
    fd.set("note_body", finalBody);
    fd.set(
      "prompt_answers",
      JSON.stringify(
        selected.prompts.map((prompt, index) => ({
          prompt_index: index,
          prompt,
          answer: answers[prompt] ?? "",
          source: interactionMode === "voice" ? "voice" : "chat",
        })),
      ),
    );
    if (linkedActivities[0]) fd.set("activity_id", linkedActivities[0].id);
    if (linkedAwards[0]) fd.set("award_id", linkedAwards[0].id);

    setSaveState("saving");
    setSaveError(null);
    try {
      await createGuidedSessionArtifacts(fd);
      if (actionPlanWindow !== "none") {
        addSessionToActionPlan(actionPlanWindow, draftNoteTitle);
      }
      setSaveState("saved");
      toast.success("Session saved.");
    } catch (error) {
      console.error("Save session failed:", error);
      const message = error instanceof Error ? error.message : "Failed to save session.";
      setSaveError(message);
      setSaveState("error");
      toast.error(message);
    }
  }

  function chooseSession(id: SessionId) {
    const nextSession = sessionTypes.find((item) => item.id === id) ?? sessionTypes[0];
    setSelectedId(id);
    setPanel("live");
    setMode("live");
    setInteractionMode("voice");
    setTranscript("");
    setTypedEntry("");
    setSelectedActivityId(null);
    setChatMessages([]);
    setChatLoading(false);
    setChatSuggestions([]);
    setActionPlanWindow("none");
    setLinkedActivityIds(new Set());
    setLinkedAwardIds(new Set());
    setSaveState("idle");
    setSaveError(null);
    setDraftNoteTitle(`${nextSession.label}: ${shortDate(new Date().toISOString())}`);
    setDraftNoteBody(buildSessionSummary(nextSession, {}, ""));
  }

  return (
    <Scrollable>
      <PageHeader
        title={
          <>
            Guided{" "}
            <em className="font-serif italic text-[color:var(--almanac-butter)]">session</em>
          </>
        }
      />

      <div className="flex items-center justify-between gap-4 px-5 pt-5 md:px-9">
        <div className="inline-flex rounded-full border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-1">
          {(["live", "history"] as const).map((p) => (
            <button
              className={[
                "rounded-full px-4 py-2 text-sm font-medium transition",
                panel === p
                  ? "bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]"
                  : "text-[color:var(--almanac-ink-soft)] hover:text-[color:var(--almanac-ink)]",
              ].join(" ")}
              key={p}
              onClick={() => confirmIfDirty(() => setPanel(p))}
              type="button"
            >
              {p === "live" ? "Live" : "History"}
            </button>
          ))}
        </div>
      </div>

      {panel === "history" ? <GuidedNotesPreview notes={sessionNotes} /> : null}

      <div
        className={[
          "min-w-0 gap-5 px-5 py-6 md:px-9 xl:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]",
          panel === "live" ? "grid" : "hidden",
        ].join(" ")}
      >
        <aside className="grid gap-3 self-start sm:grid-cols-2 xl:grid-cols-1">
          {sessionTypes.map((session) => {
            const active = session.id === selected.id;
            return (
              <button
                className={[
                  "rounded-2xl border p-4 text-left transition",
                  active
                    ? "border-[color:var(--almanac-ink)] bg-[color:var(--almanac-paper-deep)]"
                    : "border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] hover:bg-[color:var(--almanac-paper-deep)]",
                ].join(" ")}
                key={session.id}
                onClick={() => confirmIfDirty(() => chooseSession(session.id))}
                type="button"
              >
                <p className="font-serif text-xl leading-tight">{session.label}</p>
              </button>
            );
          })}
        </aside>

        <section className="grid min-w-0 gap-5">
          <div className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-ink)] p-5 text-[color:var(--almanac-paper)] md:p-6">
            <div className="flex flex-col-reverse gap-4 xl:flex-row xl:items-start xl:justify-between xl:gap-5">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-white/60">
                  {mode === "review"
                    ? "Save"
                    : interactionMode === "voice"
                      ? "Voice session"
                      : "Text session"}
                </p>
                <h2 className="mt-2 font-serif text-2xl leading-tight sm:text-3xl md:text-4xl">
                  {selected.label}
                </h2>
                <p className="mt-2 max-w-xl text-xs leading-5 text-white/72 md:mt-3 md:text-sm md:leading-6">
                  {selected.focus}
                </p>
              </div>
              {mode === "live" ? (
                <div className="relative inline-flex h-10 w-full max-w-[14rem] shrink-0 items-center self-start rounded-full border border-white/15 bg-white/5 p-1 text-sm font-medium xl:h-11 xl:w-36">
                  <span
                    className="absolute left-1 top-1 h-8 w-[calc(50%-0.25rem)] rounded-full bg-[color:var(--almanac-butter)] transition-transform duration-200 xl:h-9"
                    style={{
                      transform: interactionMode === "voice" ? "translateX(0)" : "translateX(100%)",
                    }}
                  />
                  <button
                    aria-pressed={interactionMode === "voice"}
                    className={[
                      "relative z-10 flex-1 text-center transition-colors",
                      interactionMode === "voice"
                        ? "text-[color:var(--almanac-ink)]"
                        : "text-white/70",
                    ].join(" ")}
                    onClick={() => setInteractionMode("voice")}
                    type="button"
                  >
                    Voice
                  </button>
                  <button
                    aria-pressed={interactionMode === "text"}
                    className={[
                      "relative z-10 flex-1 text-center transition-colors",
                      interactionMode === "text"
                        ? "text-[color:var(--almanac-ink)]"
                        : "text-white/70",
                    ].join(" ")}
                    onClick={() => setInteractionMode("text")}
                    type="button"
                  >
                    Text
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {mode === "live" ? (
            <div className="grid min-w-0 gap-5">
              {needsActivity ? (
                <ActivityPicker
                  activities={activities}
                  onSelect={setSelectedActivityId}
                  selectedId={selectedActivityId}
                />
              ) : null}

              {!activityReady ? null : interactionMode === "voice" ? (
                <VoicePanel
                  key={`${selected.id}:${selectedActivityId ?? ""}`}
                  currentPrompt={voiceOpener}
                  onTranscript={appendVoiceTranscript}
                  onReview={goToReview}
                  sessionFocus={effectiveFocus}
                  sessionPrompts={selected.prompts}
                  sessionTitle={selected.label}
                  variant="almanac"
                />
              ) : (
                <TextSession
                  loading={chatLoading}
                  messages={chatMessages}
                  onChange={setTypedEntry}
                  onClear={clearChat}
                  onPickStarter={pickStarter}
                  onReview={goToReview}
                  onSend={sendChat}
                  opener={textOpener}
                  samples={selected.prompts}
                  suggestions={chatSuggestions}
                  transcript={transcript}
                  value={typedEntry}
                />
              )}
            </div>
          ) : null}

          {mode === "review" ? (
            saveState === "saved" ? (
              <div className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-5 md:p-6">
                <SectionKicker>Saved</SectionKicker>
                <h2 className="mt-2 font-serif text-3xl leading-tight">Session saved</h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
                  &ldquo;{draftNoteTitle}&rdquo; was saved to your sessions
                  {actionPlanWindow !== "none"
                    ? ` and added to your ${
                        ACTION_PLAN_WINDOWS.find((w) => w.id === actionPlanWindow)?.label
                      } action plan`
                    : ""}
                  .
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    className="h-11 rounded-full bg-[color:var(--almanac-ink)] px-5 text-sm font-medium text-[color:var(--almanac-paper)]"
                    onClick={() => chooseSession(selected.id)}
                    type="button"
                  >
                    Start another
                  </button>
                  <button
                    className="h-11 rounded-full border border-[color:var(--almanac-rule)] px-5 text-sm"
                    onClick={() => setPanel("history")}
                    type="button"
                  >
                    View in history
                  </button>
                </div>
              </div>
            ) : (
              <form
                className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-5 md:p-6"
                onSubmit={handleSaveSession}
              >
                <div className="flex flex-col gap-2 border-b border-[color:var(--almanac-rule)] pb-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <SectionKicker>Review</SectionKicker>
                    <h2 className="mt-2 font-serif text-3xl leading-tight">Save session</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="h-11 rounded-full border border-[color:var(--almanac-rule)] px-5 text-sm"
                      onClick={goBackToSession}
                      type="button"
                    >
                      Back to session
                    </button>
                    <button
                      className="h-11 rounded-full bg-[color:var(--almanac-ink)] px-5 text-sm font-medium text-[color:var(--almanac-paper)] disabled:opacity-45"
                      disabled={
                        saveState === "saving" ||
                        !transcript.trim() ||
                        !draftNoteTitle.trim() ||
                        !draftNoteBody.trim()
                      }
                      type="submit"
                    >
                      {saveState === "saving" ? "Saving…" : "Save session"}
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4">
                  <label className="grid gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--almanac-ink-soft)]">
                      Session title
                    </span>
                    <TextInput
                      onChange={(event) => setDraftNoteTitle(event.target.value)}
                      required
                      value={draftNoteTitle}
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--almanac-ink-soft)]">
                      Summary
                    </span>
                    <textarea
                      className="min-h-48 resize-y rounded-lg border border-[color:var(--almanac-rule)] bg-white/60 px-3 py-3 text-sm leading-6 outline-none focus:border-[color:var(--almanac-olive)]"
                      onChange={(event) => setDraftNoteBody(event.target.value)}
                      required
                      value={draftNoteBody}
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--almanac-ink-soft)]">
                      Add to action plan
                    </span>
                    <select
                      className="h-11 rounded-lg border border-[color:var(--almanac-rule)] bg-white/60 px-3 text-sm outline-none focus:border-[color:var(--almanac-olive)]"
                      onChange={(event) =>
                        setActionPlanWindow(event.target.value as ActionPlanWindowId | "none")
                      }
                      value={actionPlanWindow}
                    >
                      <option value="none">Don&apos;t add</option>
                      {ACTION_PLAN_WINDOWS.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {activities.length ? (
                    <div className="grid gap-1.5">
                      <span className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--almanac-ink-soft)]">
                        Add to existing activity
                      </span>
                      <p className="text-[0.7rem] leading-5 text-[color:var(--almanac-ink-soft)]">
                        Attach this session to an activity so it shows up there too.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {activities.map((a) => (
                          <LinkChip
                            active={linkedActivityIds.has(a.id)}
                            key={a.id}
                            label={a.name}
                            onToggle={() => setLinkedActivityIds((prev) => toggleSet(prev, a.id))}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {awards.length ? (
                    <div className="grid gap-1.5">
                      <span className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--almanac-ink-soft)]">
                        Add to existing award
                      </span>
                      <p className="text-[0.7rem] leading-5 text-[color:var(--almanac-ink-soft)]">
                        Attach this session to an award so it shows up there too.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {awards.map((a) => (
                          <LinkChip
                            active={linkedAwardIds.has(a.id)}
                            key={a.id}
                            label={a.name}
                            onToggle={() => setLinkedAwardIds((prev) => toggleSet(prev, a.id))}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {saveState === "error" ? (
                    <p className="rounded-lg bg-[color:var(--almanac-clay)]/15 px-3 py-2 text-xs leading-5 text-[color:var(--almanac-clay)]">
                      {saveError ?? "Failed to save session."}
                    </p>
                  ) : null}
                </div>
              </form>
            )
          ) : null}
        </section>
      </div>
    </Scrollable>
  );
}

function GuidedNotesPreview({ notes }: { notes: Note[] }) {
  return (
    <div className="px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:px-9">
      <section className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-5 md:p-6">
        <SectionKicker>Recent guided notes</SectionKicker>
        <div className="mt-4 grid gap-3">
          {notes.slice(0, 8).map((note) => (
            <article
              className="rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-4"
              key={note.id}
            >
              <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
                {note.category} - {shortDate(note.created_at)}
              </p>
              <h3 className="mt-2 font-serif text-xl leading-tight">{note.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
                {note.body}
              </p>
            </article>
          ))}
          {!notes.length ? (
            <Empty label="Complete a guided session to create your first saved session note." />
          ) : null}
        </div>
      </section>
    </div>
  );
}

function ActivityPicker({
  activities,
  onSelect,
  selectedId,
}: {
  activities: Activity[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  return (
    <section className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-5 md:p-6">
      <SectionKicker>Step 1</SectionKicker>
      <h3 className="mt-2 font-serif text-2xl leading-tight">
        Which activity do you want to deepen?
      </h3>
      {activities.length ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {activities.map((a) => {
            const active = a.id === selectedId;
            return (
              <button
                className={[
                  "rounded-xl border p-3 text-left transition",
                  active
                    ? "border-[color:var(--almanac-ink)] bg-[color:var(--almanac-paper-deep)]"
                    : "border-[color:var(--almanac-rule)] hover:bg-[color:var(--almanac-paper-deep)]",
                ].join(" ")}
                key={a.id}
                onClick={() => onSelect(a.id)}
                type="button"
              >
                <p className="font-medium leading-tight text-[color:var(--almanac-ink)]">
                  {a.name}
                </p>
                {a.role ? (
                  <p className="mt-0.5 text-xs text-[color:var(--almanac-ink-soft)]">{a.role}</p>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <Empty label="No activities yet. Add one from Dashboard → Activities first, then come back to deepen it." />
      )}
    </section>
  );
}

function TextSession({
  loading,
  messages,
  onChange,
  onClear,
  onPickStarter,
  onReview,
  onSend,
  opener,
  samples,
  suggestions,
  transcript,
  value,
}: {
  loading: boolean;
  messages: ChatMessage[];
  onChange: (value: string) => void;
  onClear: () => void;
  onPickStarter: (text: string) => void;
  onReview: () => void;
  onSend: (text: string) => void;
  opener: string;
  samples: readonly string[];
  suggestions: string[];
  transcript: string;
  value: string;
}) {
  const started = messages.length > 0;
  // Show at most 2 sharply different prompts as chips. Initially hidden —
  // surfaced via "Not sure where to start?" or auto-revealed after a pause.
  const chips = (started ? suggestions : samples).slice(0, 2);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [chipsVisible, setChipsVisible] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  // Reset progressive-disclosure state whenever the conversation resets.
  useEffect(() => {
    if (messages.length === 0) setChipsVisible(false);
  }, [messages.length]);

  // Auto-reveal chips after 8s of inactivity if the user hasn't started typing
  // and the conversation hasn't begun — soft nudge for the stuck student.
  useEffect(() => {
    if (chipsVisible) return;
    if (started || loading) return;
    if (value.trim()) return;
    const timer = setTimeout(() => setChipsVisible(true), 8000);
    return () => clearTimeout(timer);
  }, [chipsVisible, started, loading, value]);

  function handlePickStarter(question: string) {
    onPickStarter(question);
    // Focus the reply box so the student can answer immediately.
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  return (
    <section className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-5 md:p-6">
      <SectionKicker>Text session</SectionKicker>

      <div className="mt-3 grid max-h-[26rem] gap-3 overflow-y-auto pr-1">
        <ChatBubble role="assistant" text={opener} />
        {messages.map((m, index) => (
          <ChatBubble key={index} role={m.role} text={m.content} />
        ))}
        {loading ? <ChatBubble role="assistant" typing /> : null}
        <div ref={bottomRef} />
      </div>

      {chips.length && !loading ? (
        chipsVisible ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {chips.map((q) => (
              <button
                className="rounded-full border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] px-3 py-1.5 text-left text-xs leading-snug text-[color:var(--almanac-ink-soft)] transition hover:text-[color:var(--almanac-ink)] disabled:opacity-50"
                disabled={loading}
                key={q}
                onClick={() => handlePickStarter(q)}
                type="button"
              >
                {q}
              </button>
            ))}
          </div>
        ) : !started ? (
          <button
            className="mt-4 text-xs italic text-[color:var(--almanac-ink-soft)] underline-offset-2 transition hover:text-[color:var(--almanac-ink)] hover:underline"
            onClick={() => setChipsVisible(true)}
            type="button"
          >
            Not sure where to start?
          </button>
        ) : null
      ) : null}

      <div className="mt-4 flex items-end gap-2">
        <textarea
          className="min-h-12 flex-1 resize-y rounded-xl border border-[color:var(--almanac-rule)] bg-white/60 px-3 py-2.5 text-sm leading-6 outline-none focus:border-[color:var(--almanac-olive)]"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend(value);
            }
          }}
          placeholder={started ? "Type your reply…" : "Type your question or topic…"}
          ref={textareaRef}
          rows={2}
          value={value}
        />
        <button
          className="h-11 shrink-0 self-end rounded-full bg-[color:var(--almanac-ink)] px-5 text-sm font-medium text-[color:var(--almanac-paper)] disabled:opacity-45"
          disabled={!value.trim() || loading}
          onClick={() => onSend(value)}
          type="button"
        >
          Send
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="h-11 rounded-full border border-[color:var(--almanac-rule)] px-5 text-sm disabled:opacity-45"
          disabled={!transcript.trim()}
          onClick={onReview}
          type="button"
        >
          Review &amp; save
        </button>
        <button
          className="h-11 rounded-full border border-[color:var(--almanac-rule)] px-5 text-sm text-[color:var(--almanac-ink-soft)] transition hover:text-[color:var(--almanac-ink)] disabled:opacity-45"
          disabled={!transcript.trim() && messages.length === 0}
          onClick={() => {
            if (
              !transcript.trim() ||
              window.confirm("Clear this conversation and start over?")
            ) {
              onClear();
            }
          }}
          type="button"
        >
          Clear and restart
        </button>
      </div>
    </section>
  );
}

function ChatBubble({
  role,
  text,
  typing = false,
}: {
  role: "user" | "assistant";
  text?: string;
  typing?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={["flex", isUser ? "justify-end" : "justify-start"].join(" ")}>
      <div
        className={[
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-6",
          isUser
            ? "bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]"
            : "border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] text-[color:var(--almanac-ink)]",
        ].join(" ")}
      >
        {typing ? (
          <span className="inline-flex items-center gap-1 py-1">
            <span className="size-1.5 animate-bounce rounded-full bg-[color:var(--almanac-ink-soft)] [animation-delay:-0.3s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-[color:var(--almanac-ink-soft)] [animation-delay:-0.15s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-[color:var(--almanac-ink-soft)]" />
          </span>
        ) : (
          text
        )}
      </div>
    </div>
  );
}

function LinkChip({
  active,
  label,
  onToggle,
}: {
  active: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      className={[
        "rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active
          ? "border-[color:var(--almanac-ink)] bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]"
          : "border-[color:var(--almanac-rule)] text-[color:var(--almanac-ink-soft)] hover:text-[color:var(--almanac-ink)]",
      ].join(" ")}
      onClick={onToggle}
      type="button"
    >
      {label}
    </button>
  );
}

function toggleSet(prev: Set<string>, id: string): Set<string> {
  const next = new Set(prev);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/**
 * Append a session as an item into the Action Plan's localStorage so it appears
 * immediately in the chosen window. Mirrors the structure used by ActionPlanView
 * in almanac-workspace.tsx (storage key `cultvr-action-plan-v3`).
 */
function addSessionToActionPlan(windowId: ActionPlanWindowId, text: string) {
  if (typeof window === "undefined") return;
  const STORAGE_KEY = "cultvr-action-plan-v3";
  type Item = { id: string; text: string; done: boolean };
  type Store = Record<string, Record<string, Item[]>>;

  let store: Store;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    store = raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    store = {};
  }

  if (!store[windowId]) {
    store[windowId] = { priority: [], secondary: [], reaches: [], targets: [] };
  }
  const section = windowId === "1year" || windowId === "longterm" ? "reaches" : "priority";
  if (!Array.isArray(store[windowId][section])) store[windowId][section] = [];

  store[windowId][section].push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text,
    done: false,
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-11 rounded-lg border border-[color:var(--almanac-rule)] bg-white/60 px-3 text-sm outline-none focus:border-[color:var(--almanac-olive)]"
    />
  );
}

function PageHeader({ eyebrow, title }: { eyebrow?: string; title: ReactNode }) {
  return (
    <header className="border-b border-[color:var(--almanac-rule)] px-5 py-6 md:px-9 md:py-8">
      <div className="max-w-5xl">
        {eyebrow ? (
          <p className="text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--almanac-ink-soft)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 font-serif text-4xl leading-[1.02] text-[color:var(--almanac-ink)] md:text-5xl">
          {title}
        </h1>
      </div>
    </header>
  );
}

function SectionKicker({ children }: { children: ReactNode }) {
  return (
    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[color:var(--almanac-ink-soft)]">
      {children}
    </p>
  );
}

function Scrollable({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
      {children}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[color:var(--almanac-rule)] px-4 py-6 text-center text-sm text-[color:var(--almanac-ink-soft)]">
      {label}
    </div>
  );
}

function buildSessionSummary(
  session: Session,
  answers: Record<string, string>,
  transcript: string,
) {
  const sourceItems = [
    transcript.trim(),
    ...session.prompts
      .map((prompt) => answers[prompt]?.trim())
      .filter((answer): answer is string => Boolean(answer)),
  ].filter(Boolean);
  const points = summarizePoints(sourceItems.join("\n"));

  return [
    `Session: ${session.label}`,
    `Focus: ${session.focus}`,
    "",
    "Brief points discussed",
    points.length
      ? points.map((point) => `- ${point}`).join("\n")
      : "- No conversation notes captured yet.",
  ].join("\n");
}

function summarizePoints(text: string) {
  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/^Student:\s*/i, "")
    .trim();

  if (!cleaned) return [];

  return cleaned
    .split(/(?<=[.!?])\s+|\n+/)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((item) => (item.length > 180 ? `${item.slice(0, 177).trim()}...` : item));
}

function shortDate(date: string | null) {
  if (!date) return "today";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "today";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(parsed);
}
