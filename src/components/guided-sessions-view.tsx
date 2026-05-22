"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";

import { createGuidedSessionArtifacts } from "@/app/dashboard/actions";
import { VoicePanel } from "@/components/voice-panel";
import type { Note } from "@/lib/types";

const sessionTypes = [
  {
    id: "activity-impact",
    label: "Activity impact builder",
    focus: "Move an activity from participation to measurable contribution.",
    prompts: [
      "What is the activity, role, and time commitment?",
      "Who did your work help, lead, teach, organize, or improve?",
      "What leadership, initiative, or measurable outcome should colleges notice?",
    ],
  },
  {
    id: "essay-story",
    label: "Essay story mining",
    focus: "Find a personal story that can carry an essay.",
    prompts: [
      "Describe a moment you still remember clearly.",
      "What did that moment reveal about your values, curiosity, or growth?",
      "What would a reader learn about you that is not obvious elsewhere?",
    ],
  },
  {
    id: "achievement",
    label: "Achievement brainstorm",
    focus: "Find the proof points inside a win.",
    prompts: [
      "What happened, and what role did you personally play?",
      "What was hard, competitive, unusual, or meaningful about it?",
      "What changed because of your work? Include numbers when possible.",
    ],
  },
  {
    id: "resilience",
    label: "Challenge/resilience reflection",
    focus: "Frame difficulty with agency and growth.",
    prompts: [
      "What challenge, constraint, or setback shaped you?",
      "What choices did you make while dealing with it?",
      "What changed in how you think, work, ask for help, or lead?",
    ],
  },
  {
    id: "major-career",
    label: "Major/career interests",
    focus: "Connect interests to evidence and next exploration.",
    prompts: [
      "What subjects, problems, or communities keep pulling your attention?",
      "What experiences prove this interest is real?",
      "What do you want to explore next before choosing a major direction?",
    ],
  },
  {
    id: "college-fit",
    label: "College fit exploration",
    focus: "Define the environment where you are likely to thrive.",
    prompts: [
      "What kind of learning environment helps you do your best work?",
      "What campus, location, cost, support, or community factors matter?",
      "What would make a college a poor fit even if it is prestigious?",
    ],
  },
  {
    id: "interview-prep",
    label: "Interview prep",
    focus: "Prepare clear stories for common interview questions.",
    prompts: [
      "What do you want an interviewer to remember about you?",
      "Which activity, challenge, or interest best shows that quality?",
      "What question do you want to ask the interviewer?",
    ],
  },
] as const;

type SessionId = (typeof sessionTypes)[number]["id"];
type Session = (typeof sessionTypes)[number];
type GuidedPanel = "live" | "history";

export function GuidedSessionsView({ notes }: { notes: Note[] }) {
  const [selectedId, setSelectedId] = useState<SessionId>(sessionTypes[0].id);
  const [panel, setPanel] = useState<GuidedPanel>("live");
  const [mode, setMode] = useState<"live" | "review">("live");
  const [interactionMode, setInteractionMode] = useState<"voice" | "chat">("voice");
  const [promptIndex, setPromptIndex] = useState(0);
  const [typedEntry, setTypedEntry] = useState("");
  const [transcript, setTranscript] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const selected = sessionTypes.find((item) => item.id === selectedId) ?? sessionTypes[0];
  const sessionNotes = notes.filter((note) => note.category.startsWith("Guided:"));
  const currentPrompt = selected.prompts[promptIndex] ?? selected.prompts[0];
  const generatedNoteTitle = `${selected.label}: ${shortDate(new Date().toISOString())}`;
  const generatedNoteBody = buildSessionSummary(selected, answers, transcript);
  const [draftNoteTitle, setDraftNoteTitle] = useState<string>(generatedNoteTitle);
  const [draftNoteBody, setDraftNoteBody] = useState<string>(generatedNoteBody);
  const answeredCount = selected.prompts.filter((prompt) => answers[prompt]?.trim()).length;

  function setAnswer(prompt: string, answer: string) {
    setAnswers((current) => {
      const next = { ...current, [prompt]: answer };
      setDraftNoteBody(buildSessionSummary(selected, next, transcript));
      return next;
    });
  }

  function appendTypedEntry() {
    const entry = typedEntry.trim();
    if (!entry) return;

    const nextTranscript = transcript
      ? `${transcript}\n\n${currentPrompt}\nStudent: ${entry}`
      : `${currentPrompt}\nStudent: ${entry}`;

    setTranscript(nextTranscript);
    setTypedEntry("");
    setAnswer(currentPrompt, entry);
    setDraftNoteBody(
      buildSessionSummary(selected, { ...answers, [currentPrompt]: entry }, nextTranscript),
    );
  }

  function appendVoiceTranscript(entry: string) {
    const cleaned = entry.trim();
    if (!cleaned) return;

    setTranscript((current) => {
      const nextTranscript = current ? `${current}\nStudent: ${cleaned}` : `Student: ${cleaned}`;
      setDraftNoteBody(buildSessionSummary(selected, answers, nextTranscript));
      return nextTranscript;
    });
  }

  function extractDrafts() {
    setDraftNoteTitle(`${selected.label}: ${shortDate(new Date().toISOString())}`);
    setDraftNoteBody(buildSessionSummary(selected, answers, transcript));
  }

  function clearDrafts() {
    setDraftNoteTitle("");
    setDraftNoteBody("");
  }

  function goToReview() {
    extractDrafts();
    setMode("review");
  }

  function goBackToSession() {
    setMode("live");
  }

  function movePrompt(direction: 1 | -1) {
    setPromptIndex((current) =>
      Math.min(Math.max(current + direction, 0), selected.prompts.length - 1),
    );
  }

  function activateInteraction(nextMode: "voice" | "chat") {
    setInteractionMode(nextMode);
    setMode("live");
    if (nextMode === "chat") {
      setPromptIndex(0);
    }
  }

  function chooseSession(id: SessionId) {
    const nextSession = sessionTypes.find((item) => item.id === id) ?? sessionTypes[0];

    setSelectedId(id);
    setPanel("live");
    setMode("live");
    setInteractionMode("voice");
    setPromptIndex(0);
    setAnswers({});
    setTypedEntry("");
    setTranscript("");
    setDraftNoteTitle(`${nextSession.label}: ${shortDate(new Date().toISOString())}`);
    setDraftNoteBody(buildSessionSummary(nextSession, {}, ""));
  }

  return (
    <Scrollable>
      <PageHeader
        subtitle="Pick a session and keep the conversation moving. Switch to chat only when you want the prompts on screen."
        title={
          <>
            Guided{" "}
            <em className="font-serif italic text-[color:var(--almanac-butter)]">
              session
            </em>
          </>
        }
      />

      <div className="flex items-center justify-between gap-4 px-5 pt-5 md:px-9">
        <div className="inline-flex rounded-full border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-1">
          <button
            className={[
              "rounded-full px-4 py-2 text-sm font-medium transition",
              panel === "live"
                ? "bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]"
                : "text-[color:var(--almanac-ink-soft)] hover:text-[color:var(--almanac-ink)]",
            ].join(" ")}
            onClick={() => setPanel("live")}
            type="button"
          >
            Live
          </button>
          <button
            className={[
              "rounded-full px-4 py-2 text-sm font-medium transition",
              panel === "history"
                ? "bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]"
                : "text-[color:var(--almanac-ink-soft)] hover:text-[color:var(--almanac-ink)]",
            ].join(" ")}
            onClick={() => setPanel("history")}
            type="button"
          >
            History
          </button>
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
                onClick={() => chooseSession(session.id)}
                type="button"
              >
                <p className="font-serif text-xl leading-tight">{session.label}</p>
              </button>
            );
          })}
        </aside>

        <section className="grid min-w-0 gap-5">
          <div className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-ink)] p-5 text-[color:var(--almanac-paper)] md:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-white/60">
                  {mode === "review"
                    ? "Review saves"
                    : interactionMode === "voice"
                      ? "Live session"
                      : `Chat question ${promptIndex + 1} of ${selected.prompts.length}`}
                </p>
                <h2 className="mt-2 font-serif text-4xl leading-tight">
                  {selected.label}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/72">
                  {selected.focus}
                </p>
              </div>
              <button
                aria-label={`Switch to ${interactionMode === "voice" ? "chat" : "voice"} mode`}
                aria-pressed={interactionMode === "voice"}
                className="relative inline-flex h-11 w-36 items-center rounded-full border border-white/15 bg-white/5 p-1 text-sm font-medium text-white/75 transition hover:bg-white/10"
                onClick={() =>
                  activateInteraction(interactionMode === "voice" ? "chat" : "voice")
                }
                type="button"
              >
                <span
                  className="absolute left-1 top-1 h-9 w-[calc(50%-0.25rem)] rounded-full bg-[color:var(--almanac-butter)] transition-transform duration-200"
                  style={{
                    transform:
                      interactionMode === "voice" ? "translateX(0)" : "translateX(100%)",
                  }}
                />
                <span
                  className={[
                    "relative z-10 flex-1 text-center transition-colors",
                    interactionMode === "voice"
                      ? "text-[color:var(--almanac-ink)]"
                      : "text-white/70",
                  ].join(" ")}
                >
                  Voice
                </span>
                <span
                  className={[
                    "relative z-10 flex-1 text-center transition-colors",
                    interactionMode === "chat"
                      ? "text-[color:var(--almanac-ink)]"
                      : "text-white/70",
                  ].join(" ")}
                >
                  Chat
                </span>
              </button>
            </div>
          </div>

          {mode === "live" ? (
            interactionMode === "voice" ? (
              <div className="grid min-w-0 gap-5">
                <VoicePanel
                  key={selected.id}
                  currentPrompt={currentPrompt}
                  onTranscript={appendVoiceTranscript}
                  onReview={goToReview}
                  sessionFocus={selected.focus}
                  sessionPrompts={selected.prompts}
                  sessionTitle={selected.label}
                  variant="almanac"
                />
              </div>
            ) : (
              <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <section className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-5 md:p-6">
                  <div className="flex flex-col gap-4 border-b border-[color:var(--almanac-rule)] pb-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <SectionKicker>Chat based</SectionKicker>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
                        Question {promptIndex + 1} of {selected.prompts.length}
                      </p>
                      <h3 className="mt-2 font-serif text-3xl leading-tight">
                        {currentPrompt}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="h-10 rounded-full border border-[color:var(--almanac-rule)] px-4 text-sm disabled:opacity-40"
                        disabled={promptIndex === 0}
                        onClick={() => movePrompt(-1)}
                        type="button"
                      >
                        Previous
                      </button>
                      <button
                        className="h-10 rounded-full border border-[color:var(--almanac-rule)] px-4 text-sm disabled:opacity-40"
                        disabled={promptIndex === selected.prompts.length - 1}
                        onClick={() => movePrompt(1)}
                        type="button"
                      >
                        Next
                      </button>
                    </div>
                  </div>

                  <textarea
                    className="mt-4 min-h-40 w-full resize-y rounded-xl border border-[color:var(--almanac-rule)] bg-white/60 px-3 py-3 text-sm leading-6 outline-none focus:border-[color:var(--almanac-olive)]"
                    onChange={(event) => setTypedEntry(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        appendTypedEntry();
                      }
                    }}
                    placeholder="Type the student's answer here."
                    value={typedEntry}
                  />
                  <button
                    className="mt-3 h-11 rounded-full bg-[color:var(--almanac-ink)] px-5 text-sm font-medium text-[color:var(--almanac-paper)]"
                    onClick={appendTypedEntry}
                    type="button"
                  >
                    Add answer
                  </button>
                </section>

                <section className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-5 md:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <SectionKicker>Captured answers</SectionKicker>
                    <span className="text-xs uppercase tracking-[0.14em] text-[color:var(--almanac-ink-soft)]">
                      {answeredCount} of {selected.prompts.length} answered
                    </span>
                  </div>
                  <div className="mt-5 grid gap-4">
                    {selected.prompts.map((prompt, index) => (
                      <article
                        className="rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-4"
                        key={prompt}
                      >
                        <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--almanac-ink-soft)]">
                          {index + 1}
                        </p>
                        <p className="mt-2 font-medium leading-6">{prompt}</p>
                        <p className="mt-3 text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
                          {answers[prompt] || "No answer captured yet."}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            )
          ) : null}

          {mode === "review" ? (
            <form
              action={createGuidedSessionArtifacts}
              className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-5 md:p-6"
            >
              <input name="session_type" type="hidden" value={selected.label} />
              <input name="session_label" type="hidden" value={selected.label} />
              <input name="session_focus" type="hidden" value={selected.focus} />
              <input name="interaction_mode" type="hidden" value={interactionMode} />
              <input name="transcript" type="hidden" value={transcript} />
              <input
                name="prompt_answers"
                type="hidden"
                value={JSON.stringify(
                  selected.prompts.map((prompt, index) => ({
                    prompt_index: index,
                    prompt,
                    answer: answers[prompt] ?? "",
                    source: interactionMode === "voice" ? "voice" : "chat",
                  })),
                )}
              />
              <div className="flex flex-col gap-2 border-b border-[color:var(--almanac-rule)] pb-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <SectionKicker>Review</SectionKicker>
                  <h2 className="mt-2 font-serif text-3xl leading-tight">
                    Conversation summary
                  </h2>
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
                    className="h-11 rounded-full border border-[color:var(--almanac-rule)] px-5 text-sm"
                    onClick={clearDrafts}
                    type="button"
                  >
                    Clear
                  </button>
                  <button
                    className="h-11 rounded-full bg-[color:var(--almanac-ink)] px-5 text-sm font-medium text-[color:var(--almanac-paper)] disabled:opacity-45"
                    disabled={
                      (!transcript.trim() && answeredCount === 0) ||
                      !draftNoteTitle.trim() ||
                      !draftNoteBody.trim()
                    }
                  >
                    Save summary
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                <DraftCard title="Brief points discussed">
                  <TextInput
                    name="note_title"
                    required
                    value={draftNoteTitle}
                    onChange={(event) => setDraftNoteTitle(event.target.value)}
                  />
                  <textarea
                    className="min-h-56 resize-y rounded-lg border border-[color:var(--almanac-rule)] bg-white/60 px-3 py-3 text-sm leading-6 outline-none focus:border-[color:var(--almanac-olive)]"
                    name="note_body"
                    required
                    value={draftNoteBody}
                    onChange={(event) => setDraftNoteBody(event.target.value)}
                  />
                </DraftCard>
              </div>
            </form>
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
          {notes.slice(0, 5).map((note) => (
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

function DraftCard({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="grid gap-3 rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--almanac-ink-soft)]">
        {title}
      </p>
      {children}
    </section>
  );
}

function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-11 rounded-lg border border-[color:var(--almanac-rule)] bg-white/60 px-3 text-sm outline-none focus:border-[color:var(--almanac-olive)]"
    />
  );
}

function PageHeader({
  eyebrow,
  subtitle,
  title,
}: {
  eyebrow?: string;
  subtitle: string;
  title: ReactNode;
}) {
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
        <p className="mt-3 max-w-3xl text-[0.97rem] leading-7 text-[color:var(--almanac-ink-soft)]">
          {subtitle}
        </p>
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
    .slice(0, 5)
    .map((item) => (item.length > 180 ? `${item.slice(0, 177).trim()}...` : item));

}

function shortDate(date: string | null) {
  if (!date) return "today";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "today";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parsed);
}
