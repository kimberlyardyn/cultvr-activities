"use client";

import { Loader2, Mic, Pencil, Square, Trash2 } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import {
  createGuidedSessionArtifacts,
  deleteNote,
  updateNote,
} from "@/app/dashboard/actions";
import { toast } from "@/components/toast";
import { VoicePanel } from "@/components/voice-panel";
import type { Activity, Award, Goal, Note } from "@/lib/types";

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
    // General Brainstorm is intentionally wide-open, so it offers a richer set
    // of starter questions spanning activities, growth, goals, and reflection.
    prompts: [
      "What's something you've wanted to try but haven't yet?",
      "If nothing were holding you back, what would you start this month?",
      "What's an activity or class that's felt genuinely exciting lately?",
      "Where do you want to be a year from now — and what's one step toward it?",
      "What's a skill or strength you'd love to grow?",
      "Is there a problem in your school or community you wish someone would fix?",
      "When do you lose track of time? What are you usually doing?",
      "What's something you're proud of that you don't talk about much?",
    ],
  },
  {
    id: "open-session",
    label: "Open Session",
    focus:
      "Write freely about whatever's on your mind — no prompts, no AI. Saved straight to your notes.",
    opener: "",
    prompts: [],
    freeform: true,
  },
  {
    id: "new-activity",
    label: "New Activity",
    focus:
      "Capture a new activity you've started — or explore one you'd like to start — and shape it into a strong entry.",
    opener: "What kind of new activity are you drawn to right now?",
    prompts: [
      "Something tied to your major, a leadership role, social impact, or pure interest — what are you interested in pursuing?",
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
      "What is something you've done recently that really mattered to you?",
      "What was the impact of something you have said or done recently? Any numbers you can put to it?",
    ],
  },
  {
    id: "challenge-reflection",
    label: "Challenge Reflection",
    focus: "Frame a setback or difficulty with agency and growth.",
    opener: "What's a challenge that's been weighing on you?",
    prompts: [
      "What is something that didn't go as planned?",
      "Did you recently feel like you stepped out of your comfort zone? Any moments where you felt anxious/nervous/frustrated at first?",
    ],
  },
  {
    id: "academic-exploration",
    label: "Academic Exploration",
    focus: "Connect academic interests to evidence and next steps.",
    opener: "What subject or problem keeps drawing your interest?",
    prompts: [
      "What's one thing you'd want to learn or try next academically?",
      "What's a news article, invention, book, or phenomena that has recently caught your attention?",
    ],
  },
  {
    id: "career-exploration",
    label: "Career Exploration",
    focus: "Explore career directions and what they require.",
    opener: "What kind of work are you curious about lately?",
    prompts: [
      "When you see yourself in 10 years, what kind of person do you want to be — and what kind of job can help you get there?",
      "Are there any current activities or achievements that relate to potential career choices for you? What matters the most to you when you think of career - the day-to-day routine, salary, social opportunities, societal impact, job stability, intellectual stimulation, or something else?",
    ],
  },
  {
    id: "goal-setting",
    label: "Goal Setting",
    focus: "Turn intentions into concrete, trackable goals.",
    opener: "What's something you would like to accomplish in the next week, month, or year?",
    prompts: [
      "What's a new skill you would like to develop?",
      "What kind of impact do you want to be remembered for in the next 5-10 years?",
    ],
  },
  {
    id: "narrative-mining",
    label: "Narrative Mining",
    focus: "Find the personal stories that can carry an essay.",
    opener: "What's an experience that you would like to put down in words?",
    // Narrative Mining has a lot of possible angles, so its starter prompts are
    // organized into categories the student can pick from. `prompts` keeps a
    // flat representative set for the voice coach + saved-session summary.
    prompts: [
      "What's a memory you find yourself coming back to?",
      "What's something you've worked on that mattered to you?",
    ],
    promptGroups: [
      {
        label: "Personal storytelling",
        questions: [
          "What's a memory you find yourself coming back to?",
          "What's an experience that shaped how you see yourself?",
          "What's a story from your life that feels important, even if you're not sure why?",
          "What's something that happened to you that changed the way you think?",
        ],
      },
      {
        label: "Activity reflection",
        questions: [
          "What's an activity, project, hobby, or responsibility you want to talk about?",
          "What's something you've worked on that mattered to you?",
          "What's a commitment that shows something about who you are?",
          "What's something you kept showing up for?",
        ],
      },
      {
        label: "Leadership",
        questions: [
          "What do you feel are the most important qualities of strong leaders, and how have you been striving for this?",
          "When have you taken responsibility for something?",
          "When have other people relied on you?",
          "When have you helped a group, project, or person make progress?",
          "When have you stepped in, even without being asked?",
        ],
      },
      {
        label: "Values & personal themes",
        questions: [
          "What kinds of things naturally matter to you?",
          "What do you often notice, question, or care about?",
          "What's a belief, interest, or problem you keep coming back to?",
          "What feels important to you right now?",
        ],
      },
      {
        label: "Branding",
        questions: [
          "What inspired you to start this product/initiative?",
          "How do you want people to understand you or your product/initiative?",
          "What sets you/your product/initiative apart and makes it unique?",
        ],
      },
    ],
  },
  {
    id: "interview-prep",
    label: "Interview Prep",
    focus: "Practice for interviews with a tailored mock session.",
    aiGuidance:
      "Run a tailored mock interview. The student first says what the interview is for. After they answer, reply with ONE short line only (e.g. \"Got it — Yale College.\") and DO NOT list question types — the app shows clickable category buttons for that. When the student picks a category (or 'random mix'), act as the interviewer: ask one realistic question at a time tailored to their goal, wait for the answer, give brief constructive feedback, then continue.",
    aiGuidanceVoice:
      "Run a tailored mock interview by voice. The student first says what the interview is for. After they answer, briefly acknowledge it, then ASK OUT LOUD what kinds of questions they'd like to practice — for example: tell me about yourself, why this school or role, strengths and weaknesses, behavioral, situational, or a random mix. Once they choose, act as the interviewer: ask one realistic question at a time tailored to their goal, wait for the answer, give brief feedback, then continue.",
    opener:
      "What's this interview for — admission to a certain school or program, a specific job or career path, or just general interview practice?",
    // Hold the option chips until the student answers the opener, then surface
    // these clickable question-type choices as the "what to practice" step.
    deferStarters: true,
    prompts: [
      "Tell me about yourself",
      "Why this school / program / role",
      "Strengths & weaknesses",
      "Behavioral questions",
      "Situational questions",
      "Random mix",
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
  goals,
  notes,
}: {
  activities: Activity[];
  awards: Award[];
  goals: Goal[];
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
  const [linkedGoalIds, setLinkedGoalIds] = useState<Set<string>>(new Set());
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
  // Open Session: a free-write entry with no AI, no voice/text coach, no
  // prompts — the student just writes and it's saved verbatim as a note.
  const isFreeform = selected.id === "open-session";
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
  // What the AI actually receives: prefer a session's richer behavior script
  // over the short display `focus`. Voice mode uses `aiGuidanceVoice` when
  // present (voice has no clickable chips, so it must ASK options aloud);
  // otherwise both modes fall back to `aiGuidance`, then `focus`.
  const voiceGuidance =
    "aiGuidanceVoice" in selected ? selected.aiGuidanceVoice : undefined;
  const textGuidance = "aiGuidance" in selected ? selected.aiGuidance : undefined;
  const baseFocus =
    (interactionMode === "voice" ? voiceGuidance ?? textGuidance : textGuidance) ??
    selected.focus;
  const effectiveFocus = (
    needsActivity && chosenActivity ? `${baseFocus} ${deepenContext}.` : baseFocus
  ).slice(0, 600);
  // One warm, single-question opener for both voice and text. The deepen
  // session weaves in the chosen activity name so the question is personalized.
  const opener =
    needsActivity && chosenActivity
      ? `In what ways do you want to expand your involvement in ${chosenActivity.name}?`
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
    setDraftNoteTitle(buildSessionTitle());
    // Open Session saves the student's writing verbatim — no AI summarization.
    setDraftNoteBody(
      isFreeform ? transcript.trim() : buildSessionSummary(selected, answers, transcript),
    );
    setSaveState("idle");
    setSaveError(null);
    setMode("review");
  }

  // Default save title. For Interview Prep, fold in what the interview was for
  // (the student's first reply to the "what's this for?" opener) →
  // "Interview Prep: Yale College". Other sessions use "<label>: <date>".
  function buildSessionTitle(): string {
    const date = shortDate(new Date().toISOString());
    if (selected.id === "interview-prep") {
      const firstAnswer = chatMessages.find((m) => m.role === "user")?.content;
      const subject = extractInterviewSubject(firstAnswer);
      if (subject) return `${selected.label}: ${subject}`;
    }
    return `${selected.label}: ${date}`;
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
    const linkedGoals = goals.filter((g) => linkedGoalIds.has(g.id));
    const linkLines: string[] = [];
    if (linkedActivities.length) {
      linkLines.push(`Linked activities: ${linkedActivities.map((a) => a.name).join(", ")}`);
    }
    if (linkedAwards.length) {
      linkLines.push(`Linked awards: ${linkedAwards.map((a) => a.name).join(", ")}`);
    }
    if (linkedGoals.length) {
      linkLines.push(`Linked targets: ${linkedGoals.map((g) => g.title).join(", ")}`);
    }
    const finalBody = linkLines.length
      ? `${draftNoteBody}\n\n${linkLines.join("\n")}`
      : draftNoteBody;

    const fd = new FormData();
    fd.set("session_type", selected.label);
    fd.set("session_label", selected.label);
    fd.set("session_focus", effectiveFocus);
    fd.set(
      "interaction_mode",
      isFreeform ? "chat" : interactionMode === "voice" ? "voice" : "chat",
    );
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
    if (linkedGoals[0]) fd.set("goal_id", linkedGoals[0].id);

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
    setLinkedGoalIds(new Set());
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
                    : isFreeform
                      ? "Open session"
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
              {mode === "live" && !isFreeform ? (
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
              {isFreeform ? (
                <FreeWriteSession
                  onAppend={(text) =>
                    setTranscript((cur) => {
                      const sep = cur && !/\s$/.test(cur) ? " " : "";
                      return `${cur}${sep}${text}`;
                    })
                  }
                  onClear={clearChat}
                  onChange={setTranscript}
                  onReview={goToReview}
                  value={transcript}
                />
              ) : (
                <>
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
                  deferStarters={
                    "deferStarters" in selected ? selected.deferStarters : false
                  }
                  opener={textOpener}
                  promptGroups={
                    "promptGroups" in selected ? selected.promptGroups : undefined
                  }
                  samples={selected.prompts}
                  suggestions={chatSuggestions}
                  transcript={transcript}
                  value={typedEntry}
                />
              )}
                </>
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

                  {goals.length ? (
                    <div className="grid gap-1.5">
                      <span className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--almanac-ink-soft)]">
                        Add to existing target
                      </span>
                      <p className="text-[0.7rem] leading-5 text-[color:var(--almanac-ink-soft)]">
                        Attach this session to a goal/target so it shows up there too.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {goals.map((g) => (
                          <LinkChip
                            active={linkedGoalIds.has(g.id)}
                            key={g.id}
                            label={g.title}
                            onToggle={() => setLinkedGoalIds((prev) => toggleSet(prev, g.id))}
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
            <HistoryNoteCard key={note.id} note={note} />
          ))}
          {!notes.length ? (
            <Empty label="Complete a guided session to create your first saved session note." />
          ) : null}
        </div>
      </section>
    </div>
  );
}

function HistoryNoteCard({ note }: { note: Note }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [pending, startTransition] = useTransition();

  function save() {
    if (!title.trim() || !body.trim()) return;
    const fd = new FormData();
    fd.set("id", note.id);
    fd.set("title", title.trim());
    fd.set("body", body.trim());
    startTransition(async () => {
      try {
        await updateNote(fd);
        toast.success("Session updated.");
        setEditing(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update session.");
      }
    });
  }

  function remove() {
    if (!confirm("Delete this saved session? This cannot be undone.")) return;
    const fd = new FormData();
    fd.set("id", note.id);
    startTransition(async () => {
      try {
        await deleteNote(fd);
        toast.success("Session deleted.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete session.");
      }
    });
  }

  if (editing) {
    return (
      <article className="rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-4">
        <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
          {note.category} - {shortDate(note.created_at)}
        </p>
        <input
          className="mt-2 w-full rounded-lg border border-[color:var(--almanac-rule)] bg-white/70 px-3 py-2 font-serif text-lg text-[color:var(--almanac-ink)] outline-none focus:border-[#3F4A66]"
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Session title"
          value={title}
        />
        <textarea
          className="mt-2 min-h-32 w-full resize-y rounded-lg border border-[color:var(--almanac-rule)] bg-white/70 px-3 py-2 text-sm leading-6 text-[color:var(--almanac-ink)] outline-none focus:border-[#3F4A66]"
          onChange={(e) => setBody(e.target.value)}
          placeholder="Session summary"
          value={body}
        />
        <div className="mt-3 flex gap-2">
          <button
            className="rounded-full bg-[color:var(--almanac-ink)] px-4 py-1.5 text-xs font-medium text-[color:var(--almanac-paper)] transition hover:opacity-90 disabled:opacity-50"
            disabled={pending || !title.trim() || !body.trim()}
            onClick={save}
            type="button"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
          <button
            className="rounded-full border border-[color:var(--almanac-rule)] px-4 py-1.5 text-xs font-medium text-[color:var(--almanac-ink)] transition hover:bg-black/5"
            onClick={() => {
              setTitle(note.title);
              setBody(note.body);
              setEditing(false);
            }}
            type="button"
          >
            Cancel
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="group rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
          {note.category} - {shortDate(note.created_at)}
        </p>
        <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            aria-label="Edit session"
            className="rounded-md p-1 text-[color:var(--almanac-ink-soft)] transition hover:bg-black/5 hover:text-[color:var(--almanac-ink)]"
            onClick={() => setEditing(true)}
            type="button"
          >
            <Pencil size={13} />
          </button>
          <button
            aria-label="Delete session"
            className="rounded-md p-1 text-[color:var(--almanac-ink-soft)] transition hover:bg-black/5 hover:text-[color:var(--almanac-clay)]"
            disabled={pending}
            onClick={remove}
            type="button"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <h3 className="mt-1 font-serif text-xl leading-tight">{note.title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
        {note.body}
      </p>
    </article>
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

/**
 * Open Session — a plain free-write surface with no AI coach, no prompts. The
 * student writes (or dictates) and the text is saved verbatim as a note. Voice
 * notes are recorded and transcribed (plain speech-to-text via /api/transcribe)
 * then appended to the text; there's no conversation or coaching.
 * Bound to the parent's `transcript` so save/dirty checks work.
 */
function FreeWriteSession({
  onAppend,
  onChange,
  onClear,
  onReview,
  value,
}: {
  onAppend: (text: string) => void;
  onChange: (value: string) => void;
  onClear: () => void;
  onReview: () => void;
  value: string;
}) {
  const [recState, setRecState] = useState<"idle" | "recording" | "transcribing">("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Make sure the mic is released if the user navigates away mid-recording.
  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function startRecording() {
    if (typeof MediaRecorder === "undefined") {
      toast.error("Voice recording isn't supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { audioBitsPerSecond: 32000 });
      } catch {
        recorder = new MediaRecorder(stream);
      }
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => void transcribeRecording(recorder.mimeType);
      recorder.start();
      recorderRef.current = recorder;
      setRecState("recording");
    } catch {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      toast.error("Microphone access is needed to record a voice note.");
      setRecState("idle");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recorderRef.current = null;
  }

  async function transcribeRecording(mimeType: string) {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const type = mimeType || "audio/webm";
    const blob = new Blob(chunksRef.current, { type });
    chunksRef.current = [];
    if (!blob.size) {
      setRecState("idle");
      return;
    }
    setRecState("transcribing");
    try {
      const ext = type.includes("mp4")
        ? "mp4"
        : type.includes("ogg")
          ? "ogg"
          : type.includes("wav")
            ? "wav"
            : "webm";
      const fd = new FormData();
      fd.append("audio", blob, `voice-note.${ext}`);
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = (await res.json()) as { text?: string; error?: string };
      const text = (data.text ?? "").trim();
      if (!res.ok || !text) throw new Error(data.error || "Couldn't transcribe that — try again.");
      onAppend(text);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't transcribe that.");
    } finally {
      setRecState("idle");
    }
  }

  const recording = recState === "recording";
  const transcribing = recState === "transcribing";
  const busy = recording || transcribing;

  return (
    <section className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-5 md:p-6">
      <SectionKicker>Open session</SectionKicker>
      <h3 className="mt-2 font-serif text-2xl leading-tight">What&apos;s on your mind?</h3>
      <p className="mt-1 text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
        Write freely or record a voice note — no prompts, no coaching. Whatever you put here is
        saved as a note.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          className={[
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-50",
            recording
              ? "bg-[#b0453b] text-white hover:opacity-90"
              : "bg-[#2f5d46] text-white hover:opacity-90",
          ].join(" ")}
          disabled={transcribing}
          onClick={recording ? stopRecording : startRecording}
          type="button"
        >
          {recording ? (
            <Square size={14} />
          ) : transcribing ? (
            <Loader2 className="animate-spin" size={14} />
          ) : (
            <Mic size={14} />
          )}
          {recording ? "Stop & transcribe" : transcribing ? "Transcribing…" : "Record voice note"}
        </button>
        {recording ? (
          <span className="text-xs text-[color:var(--almanac-ink-soft)]">
            Listening — speak your note, then stop.
          </span>
        ) : null}
      </div>

      <textarea
        className="mt-4 min-h-[16rem] w-full resize-y rounded-xl border border-[color:var(--almanac-rule)] bg-white/60 px-3.5 py-3 text-sm leading-7 outline-none focus:border-[color:var(--almanac-olive)]"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Start writing, or record a voice note above…"
        value={value}
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="h-11 rounded-full bg-[color:var(--almanac-ink)] px-5 text-sm font-medium text-[color:var(--almanac-paper)] disabled:opacity-45"
          disabled={!value.trim() || busy}
          onClick={onReview}
          type="button"
        >
          Review &amp; save
        </button>
        <button
          className="h-11 rounded-full border border-[color:var(--almanac-rule)] px-5 text-sm text-[color:var(--almanac-ink-soft)] transition hover:text-[color:var(--almanac-ink)] disabled:opacity-45"
          disabled={!value.trim() || busy}
          onClick={() => {
            if (!value.trim() || window.confirm("Clear this entry and start over?")) onClear();
          }}
          type="button"
        >
          Clear
        </button>
      </div>
    </section>
  );
}

function TextSession({
  deferStarters = false,
  loading,
  messages,
  onChange,
  onClear,
  onPickStarter,
  onReview,
  onSend,
  opener,
  promptGroups,
  samples,
  suggestions,
  transcript,
  value,
}: {
  deferStarters?: boolean;
  loading: boolean;
  messages: ChatMessage[];
  onChange: (value: string) => void;
  onClear: () => void;
  onPickStarter: (text: string) => void;
  onReview: () => void;
  onSend: (text: string) => void;
  opener: string;
  promptGroups?: readonly { label: string; questions: readonly string[] }[];
  samples: readonly string[];
  suggestions: string[];
  transcript: string;
  value: string;
}) {
  const started = messages.length > 0;
  // `deferStarters`: hold the session's option chips until the student has
  // replied once (e.g. Interview Prep asks "what's this for?" first, then shows
  // the practice options). After exactly one student turn, show the session's
  // own `samples`; on later turns fall back to the AI's follow-up suggestions.
  const studentTurns = messages.filter((m) => m.role === "user").length;
  const chips = deferStarters
    ? studentTurns === 1
      ? samples
      : suggestions.slice(0, 2)
    : started
      ? suggestions.slice(0, 2)
      : samples;
  // Categorized starter questions only show before the chat begins.
  const showGroups = !started && !!promptGroups?.length;
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [chipsVisible, setChipsVisible] = useState(false);
  // For grouped prompts: which category is currently expanded (null = none).
  // "__other__" is the special "write your own question" item.
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [customQuestion, setCustomQuestion] = useState("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  // Reset progressive-disclosure state whenever the conversation resets.
  useEffect(() => {
    if (messages.length === 0) setChipsVisible(false);
  }, [messages.length]);

  // Auto-reveal chips after 8s of inactivity if the user hasn't started typing
  // and the conversation hasn't begun — soft nudge for the stuck student.
  // Skipped for deferStarters sessions, which reveal their options only after
  // the first reply (handled below).
  useEffect(() => {
    if (deferStarters) return;
    if (chipsVisible) return;
    if (started || loading) return;
    if (value.trim()) return;
    const timer = setTimeout(() => setChipsVisible(true), 8000);
    return () => clearTimeout(timer);
  }, [deferStarters, chipsVisible, started, loading, value]);

  // deferStarters: reveal the option chips automatically once the student has
  // answered the opener (their first turn), and not before.
  useEffect(() => {
    if (!deferStarters) return;
    setChipsVisible(studentTurns >= 1); // eslint-disable-line react-hooks/set-state-in-effect
  }, [deferStarters, studentTurns]);

  function handlePickStarter(question: string) {
    if (deferStarters) {
      // Deferred chips are the student's CHOICE (e.g. which question type to
      // practice), so send them as a user turn — the AI then responds.
      onSend(question);
      return;
    }
    // Normal starter chips are the coach ASKING that question; the student then
    // types their answer.
    onPickStarter(question);
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

      {!loading && (showGroups || chips.length) ? (
        chipsVisible ? (
          showGroups ? (
            // Categorized starter questions: pick a category, then a question.
            <div className="mt-4 grid gap-2">
              <p className="text-[0.65rem] uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
                Pick a category to explore
              </p>
              {promptGroups!.map((group) => {
                const isOpen = openGroup === group.label;
                return (
                  <div
                    className="overflow-hidden rounded-xl border border-[color:var(--almanac-rule)]"
                    key={group.label}
                  >
                    <button
                      className="flex w-full items-center justify-between gap-2 bg-[color:var(--almanac-paper-deep)] px-3 py-2 text-left text-xs font-medium text-[color:var(--almanac-ink)] transition hover:bg-[color:var(--almanac-paper)]"
                      onClick={() => setOpenGroup(isOpen ? null : group.label)}
                      type="button"
                    >
                      {group.label}
                      <span className="text-[color:var(--almanac-ink-soft)]">
                        {isOpen ? "–" : "+"}
                      </span>
                    </button>
                    {isOpen ? (
                      <div className="flex flex-wrap gap-2 p-2.5">
                        {group.questions.map((q) => (
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
                    ) : null}
                  </div>
                );
              })}

              {/* Other — let the student write the exact question they want the
                  coach to ask. */}
              {(() => {
                const isOpen = openGroup === "__other__";
                return (
                  <div className="overflow-hidden rounded-xl border border-[color:var(--almanac-rule)]">
                    <button
                      className="flex w-full items-center justify-between gap-2 bg-[color:var(--almanac-paper-deep)] px-3 py-2 text-left text-xs font-medium text-[color:var(--almanac-ink)] transition hover:bg-[color:var(--almanac-paper)]"
                      onClick={() => setOpenGroup(isOpen ? null : "__other__")}
                      type="button"
                    >
                      Other — write your own question
                      <span className="text-[color:var(--almanac-ink-soft)]">
                        {isOpen ? "–" : "+"}
                      </span>
                    </button>
                    {isOpen ? (
                      <div className="flex items-end gap-2 p-2.5">
                        <textarea
                          className="min-h-10 flex-1 resize-y rounded-lg border border-[color:var(--almanac-rule)] bg-white/70 px-2.5 py-1.5 text-xs leading-snug text-[color:var(--almanac-ink)] outline-none focus:border-[#3F4A66]"
                          onChange={(e) => setCustomQuestion(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey && customQuestion.trim()) {
                              e.preventDefault();
                              handlePickStarter(customQuestion.trim());
                              setCustomQuestion("");
                            }
                          }}
                          placeholder="Type the question you'd like to be asked…"
                          rows={1}
                          value={customQuestion}
                        />
                        <button
                          className="shrink-0 rounded-full bg-[color:var(--almanac-ink)] px-3 py-1.5 text-xs font-medium text-[color:var(--almanac-paper)] transition hover:opacity-90 disabled:opacity-50"
                          disabled={loading || !customQuestion.trim()}
                          onClick={() => {
                            handlePickStarter(customQuestion.trim());
                            setCustomQuestion("");
                          }}
                          type="button"
                        >
                          Ask
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="mt-4 grid gap-2">
              {deferStarters && studentTurns === 1 ? (
                <p className="text-[0.65rem] uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
                  What would you like to practice?
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
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
            </div>
          )
        ) : !started && !deferStarters ? (
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

/**
 * Pull a concise interview subject from the student's free-text answer to
 * "what's this interview for?" → e.g. "It's for Yale College admissions" →
 * "Yale College". Strips common lead-ins/filler and trims to a short phrase.
 * Returns null if nothing usable.
 */
function extractInterviewSubject(answer: string | undefined): string | null {
  if (!answer) return null;
  let s = answer.trim();
  if (!s) return null;

  // Drop common lead-ins: "it's for", "this is for", "i'm interviewing for", etc.
  s = s
    .replace(
      /^(it'?s?\s+for|this\s+is\s+for|i'?m\s+interviewing\s+for|interview\s+for|for|the|an?|admission\s+to|applying\s+to|a\s+job\s+at|to)\s+/i,
      "",
    )
    .replace(/\.$/, "")
    .trim();

  if (!s) return null;

  // Keep it short: first line, first clause, capped length.
  s = s.split(/\n/)[0].split(/[,;–—]| - /)[0].trim();
  if (s.length > 48) s = `${s.slice(0, 45).trimEnd()}…`;

  // Title-case-ish: leave acronyms/proper nouns as typed; just capitalize the
  // first letter so "general practice" → "General practice".
  return s.charAt(0).toUpperCase() + s.slice(1);
}
