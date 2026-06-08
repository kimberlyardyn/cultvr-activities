"use client";

import { Loader2, Mic, PhoneOff, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceFieldUpdate = {
  name?: string;
  category?: string;
  position?: string;
  description?: string;
  organization_description?: string;
  grades?: string[];
  start_date?: string;
  end_date?: string;
  in_progress?: boolean;
  hours_per_week?: number;
  weeks_per_year?: number;
  tags?: string[];
  goals?: Array<{ title: string; target_date?: string }>;
};

type Status = "idle" | "connecting" | "live" | "error";
type TranscriptMessage = { role: "student" | "coach"; text: string };

type Props = {
  /** Called every time the AI extracts new field values from the conversation. */
  onUpdate: (update: VoiceFieldUpdate) => void;
  /** Optional initial state so the AI knows what's already been captured. */
  currentDraftSummary?: string;
  /** If true, immediately request mic and start the session on mount. */
  autoStart?: boolean;
  /** "add" for a new activity (default), "edit" when refining an existing one.
   *  Controls the coach's opening line and whether it re-runs the full intake. */
  mode?: "add" | "edit";
  /** Name of the activity being edited — used in the edit-mode opening line. */
  activityName?: string;
};

const COACH_INSTRUCTIONS = [
  "You are Cultvr's activity intake coach. Help a high school student capture one extracurricular activity for college applications.",
  "Conduct a natural, FRIENDLY conversation — do NOT read fields as a checklist. Keep your spoken responses SHORT (one or two sentences max). Listen more than you speak. Ask ONE focused question at a time and let them answer fully before moving on.",
  "CRITICAL — GOALS & TARGETS ARE A FORM FIELD YOU MUST FILL IN, NOT HOMEWORK FOR THE STUDENT: The MOMENT the student mentions ANY goal, target, plan, aspiration, or something they want to achieve for this activity — at ANY point in the conversation, not only at the end — you MUST immediately call `update_fields` with the `goals` array (send the FULL list of goals every time). A goal is something they want to ACHIEVE (e.g. 'become club president', 'qualify for nationals', 'raise $10,000 by spring') — capture it in the `goals` array, NOT as a tag. NEVER say you'll add it later, NEVER tell the student to type it in themselves, and NEVER drop it. After the tool call, confirm OUT LOUD that you wrote it down — e.g. 'Got it — I've added that goal to the form.'",
  "Walk through the activity SECTION BY SECTION. After each topic, ask 'anything else about that?' before moving on. The sections in order are:",
  "1) ORGANIZATION/ACTIVITY NAME — what is the org or activity called?",
  "2) CATEGORY — let them describe it; you pick the best match from the allowed list.",
  "3) POSITION/ROLE — what title or role do they hold? Member, captain, founder, etc.",
  "4) ABOUT THE ORGANIZATION — ASK: 'Would you like to share a bit about what this organization is — size, mission, what makes it notable?' (Fill organization_description if they say yes.)",
  "5) WHAT THEY DID — gather rich detail on responsibilities, accomplishments, impact, recognitions, takeaways. This becomes the main description.",
  "6) GRADES PARTICIPATED — ASK which school years (9, 10, 11, 12, etc.)",
  "7) START DATE — ASK 'When did you start? Month and year is great.'",
  "8) END DATE — ASK 'Are you still doing this, or has it ended? If ended, when?' Set in_progress accordingly.",
  "9) TIME COMMITMENT — ASK 'About how many hours per week, and how many weeks per year?'",
  "10) TAGS — based on what you heard, suggest a few tags (Leadership, STEM, Humanities, Service, etc.) and let them confirm.",
  "11) GOALS — if the student hasn't already brought up any goals earlier (capture those the instant they come up — see the CRITICAL goals rule above), ASK near the end: 'Do you have any goals or targets for this activity going forward? Short-term or long-term? When do you hope to reach them?' For EACH goal they share, call `update_fields` with the `goals` array — give each a short title and, when they mention a timeframe, a target_date in YYYY-MM format. If their timeframe is vague (e.g. 'spring', 'next year', 'end of the school year'), pin it down by proposing a specific month and asking them to confirm — e.g. 'Let's make that more specific — can I put April instead of spring?' — and use the month they agree to. Send the FULL list of goals each time. These are saved automatically with the activity, so confirm them out loud (e.g. 'Got it — I'll add that goal') instead of telling them to enter it manually later.",
  "",
  "CRITICAL — DESCRIPTION VOICE & STYLE:",
  "The description field is what will end up on their RESUME and college applications. Write it in CONCISE FIRST-PERSON RESUME PROSE.",
  "- USE first-person 'I' voice: 'I served as captain', 'I led weekly practice sessions', 'I organized…'.",
  "- DO NOT use third person ('they', 'their', 'this student', 'the participant').",
  "- DO NOT include personal opinion phrases like 'this is my favorite activity', 'I love this so much'.",
  "- DO use strong action verbs: led, organized, founded, coordinated, mentored, designed, raised, won, placed.",
  "- DO include concrete numbers and outcomes when shared (e.g., '20+ volunteers', '$5,000 raised', '6 elimination rounds').",
  "- KEEP it 2–5 polished sentences, ~80–250 words. Tight, factual, professional — NOT conversational.",
  "Example GOOD: 'I served as captain of the varsity debate team, leading weekly practices for 25 members. I qualified for state in Lincoln-Douglas debate twice and mentored four novice debaters who placed at regionals.'",
  "Example BAD: 'So this student really loves debate. They've been doing it for a while and it's their favorite thing.'",
  "",
  "As you learn details, call the `update_fields` tool to fill the form. Call it AS OFTEN AS YOU LEARN something new — even partial info is fine. NEVER wait until the end. As the description gets richer through the conversation, OVERWRITE it each time with the improved, polished first-person version.",
  "",
  "Category MUST be one of: Academic, Art, Athletic - Club, Athletic - JV/Varsity, Career-Oriented, Community Service (Volunteer), Computer/Technology, Cultural, Dance, Debate/Speech, Environmental, Family Responsibilities, Foreign Exchange, Internship, Journalism/Publication, LGBT, Music: Instrumental, Music: Vocal, Religious, Research, Robotics, School Spirit, Science/Math, Social Justice, Speech & Debate, Student Govt./Politics, Theater/Drama, Work (Paid), Other Club/Activity.",
  "",
  "When you've covered the sections and they sound done, give a brief verbal summary and let them know everything — including any goals — has been added to the form for them to review or refine before saving.",
].join(" ");

/**
 * Builds the per-session opening directive. The coach's very first spoken line
 * is pinned verbatim so it can't drift into filler ("Sounds great!"). In ADD
 * mode it asks what to add; in EDIT mode it names the activity and asks what to
 * change. The edit directive also stops the coach from re-running the full
 * intake on an activity that's already filled in.
 */
function buildModeInstructions(mode: "add" | "edit", activityName?: string): string {
  const name = (activityName ?? "").trim();
  const opening =
    mode === "edit"
      ? name
        ? `What would you like to edit or adjust related to ${name}?`
        : "What would you like to edit or adjust about this activity?"
      : "Let's get started. What activity would you like to add today?";

  const openingDirective = `Your VERY FIRST line must be spoken exactly, word for word, with nothing before it — no greeting, filler, or acknowledgment like 'Sure', 'Okay', or 'Sounds great': "${opening}"`;

  const editDirective =
    mode === "edit"
      ? `You are helping the student EDIT an existing activity that is already filled in${name ? ` ("${name}")` : ""}, NOT create a new one. Do NOT walk through every section like a fresh intake. Let the student lead: ask what they want to change, update only the fields they raise via update_fields, and confirm each change out loud. Still capture any goals the instant they come up.`
      : "";

  return [openingDirective, editDirective].filter(Boolean).join(" ");
}

// ── Deterministic goal backstop ──────────────────────────────────────────────
// The coach is strongly instructed to capture goals via update_fields, but as a
// safety net we ALSO scan the student's own transcript for explicit goal/target
// phrasing and write it to the form directly. This guarantees a clearly-stated
// goal lands even if the model forgets to call the tool. To avoid double-writing
// when the model DOES capture, each detected goal is held briefly and dropped if
// a fuzzily-equivalent goal was already seen (from the model or an earlier line).

const GOAL_CUES: RegExp[] = [
  /\bmy (?:goal|target|aim|objective|plan)\s+(?:is|would be|will be)\s+(?:to\s+)?(.+)/i,
  /\b(?:i|we)\s+(?:want|hope|plan|aim|intend|aspire|wanna)\s+to\s+(.+)/i,
  /\b(?:i'm|i am|we're|we are)\s+(?:hoping|planning|aiming|trying)\s+to\s+(.+)/i,
  /\b(?:i'd|i would)\s+(?:like|love)\s+to\s+(.+)/i,
  /\bgoal\s+of\s+(.+)/i,
  /\blooking\s+to\s+(.+)/i,
];

// First verbs that signal conversation rather than a goal — skip these.
const NON_GOAL_VERBS = new Set([
  "add", "tell", "talk", "say", "share", "mention", "note",
  "explain", "describe", "clarify", "confirm", "skip", "ask", "know", "see",
]);

const GOAL_STOPWORDS = new Set([
  "to", "the", "a", "an", "of", "for", "my", "our", "i", "we", "want", "wanna",
  "hope", "hoping", "plan", "planning", "aim", "aiming", "like", "would", "be",
  "this", "that", "and", "or", "by", "in", "on", "at", "with", "next", "year",
]);

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** Content-word token set used to compare two goals for rough equivalence. */
function goalTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !GOAL_STOPWORDS.has(w)),
  );
}

/** True when two token sets overlap enough to be considered the same goal. */
function goalsSimilar(a: Set<string>, b: Set<string>): boolean {
  if (!a.size || !b.size) return false;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter += 1;
  const union = a.size + b.size - inter;
  return union > 0 && inter / union >= 0.5;
}

/** Conservatively pull an explicit target month (YYYY-MM) from a sentence. Only
 *  fires on a real month name to avoid guessing wrong dates from vague phrases. */
function extractTargetMonth(sentence: string): string | undefined {
  const m = sentence
    .toLowerCase()
    .match(
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b(?:\s+(\d{4}))?/,
    );
  if (!m) return undefined;
  const month = MONTHS[m[1]];
  if (!month) return undefined;
  let year = m[2] ? Number.parseInt(m[2], 10) : new Date().getFullYear();
  // No explicit year and the month already passed → assume next year.
  if (!m[2] && month < new Date().getMonth() + 1) year += 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function toGoalTitle(clause: string): string {
  let t = clause.replace(/\s+/g, " ").replace(/[\s.,;:!?]+$/, "").trim();
  if (!t) return t;
  if (t.length > 90) t = `${t.slice(0, 88).trim()}…`;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Detect explicit goals stated in the student's own words. */
function detectGoalsInTranscript(transcript: string): Array<{ title: string; target_date?: string }> {
  const out: Array<{ title: string; target_date?: string }> = [];
  for (const raw of transcript.split(/(?<=[.!?])\s+|\n+/)) {
    const sentence = raw.trim();
    if (!sentence) continue;
    for (const cue of GOAL_CUES) {
      const m = cue.exec(sentence);
      if (!m) continue;
      const clause = (m[1] ?? "").trim().replace(/[.,;:!?]+$/, "");
      const words = clause.split(/\s+/);
      if (words.length < 2) break; // too short to be a real goal
      if (NON_GOAL_VERBS.has(words[0].toLowerCase())) break; // conversational
      out.push({ title: toGoalTitle(clause), target_date: extractTargetMonth(sentence) });
      break; // at most one goal per sentence
    }
  }
  return out;
}

const UPDATE_FIELDS_TOOL = {
  type: "function",
  name: "update_fields",
  description:
    "Update one or more fields on the activity form — including GOALS / TARGETS. Call this whenever you learn new information from the student, and ALWAYS the moment they mention a goal or target (pass the full goals array). Do not defer goals to the end or tell the student to add them manually.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Organization or activity name" },
      category: { type: "string", description: "Activity category from the allowed list" },
      position: { type: "string", description: "Student's role or title" },
      description: {
        type: "string",
        description:
          "Polished first-person resume-style narrative. Use 'I' voice. Use action verbs. No third-person, no opinion phrases. 2–5 tight sentences.",
      },
      organization_description: {
        type: "string",
        description:
          "Optional. Briefly describes the organization itself (size, mission, what makes it notable) — useful when admissions readers may not recognize the name. Only fill if the student chose to share this.",
      },
      grades: {
        type: "array",
        items: { type: "string", enum: ["9", "10", "11", "12", "Post-Graduate", "N/A"] },
      },
      start_date: { type: "string", description: "YYYY-MM" },
      end_date: { type: "string", description: "YYYY-MM" },
      in_progress: { type: "boolean" },
      hours_per_week: { type: "number" },
      weeks_per_year: { type: "number" },
      tags: { type: "array", items: { type: "string" } },
      goals: {
        type: "array",
        description:
          "Goals or targets the student wants to reach for this activity going forward. Pass the full list every time. Each item has a short title plus an optional target_date.",
        items: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Short goal statement, e.g. 'Be elected club president'.",
            },
            target_date: {
              type: "string",
              description: "Optional target month in YYYY-MM format.",
            },
          },
          required: ["title"],
          additionalProperties: false,
        },
      },
    },
    additionalProperties: false,
  },
};

export function ActivityVoiceCoach({
  onUpdate,
  currentDraftSummary,
  autoStart = false,
  mode = "add",
  activityName,
}: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const studentItemIdRef = useRef<string | null>(null);
  const coachItemIdRef = useRef<string | null>(null);
  const studentDraftRef = useRef("");
  const coachDraftRef = useRef("");
  // Goal backstop: token sets of goals already captured this session (from the
  // model or a prior line), plus pending debounce timers keyed by goal signature.
  const seenGoalTokensRef = useRef<Set<string>[]>([]);
  const goalTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const cleanup = useCallback((resetStatus = true) => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    peerRef.current?.close();
    streamRef.current = null;
    peerRef.current = null;
    channelRef.current = null;
    studentItemIdRef.current = null;
    coachItemIdRef.current = null;
    studentDraftRef.current = "";
    coachDraftRef.current = "";
    goalTimersRef.current.forEach((t) => clearTimeout(t));
    goalTimersRef.current.clear();
    seenGoalTokensRef.current = [];
    if (resetStatus) setStatus("idle");
  }, []);

  useEffect(() => () => cleanup(false), [cleanup]);

  // Auto-start when invoked via the "Voice add" button.
  useEffect(() => {
    if (autoStart) {
      void start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  const upsertMessage = useCallback(
    (role: "student" | "coach", itemId: string, chunk: string, final = false) => {
      const itemRef = role === "student" ? studentItemIdRef : coachItemIdRef;
      const draftRef = role === "student" ? studentDraftRef : coachDraftRef;

      const merge = (current: string, next: string) => {
        if (!current) return next;
        if (!next) return current;
        if (next === current) return current;
        if (next.startsWith(current)) return next;
        if (current.startsWith(next)) return current;
        let overlap = 0;
        const limit = Math.min(current.length, next.length);
        for (let size = limit; size > 0; size -= 1) {
          if (current.endsWith(next.slice(0, size))) {
            overlap = size;
            break;
          }
        }
        return `${current}${next.slice(overlap)}`;
      };

      setMessages((cur) => {
        const next = [...cur];
        const last = next[next.length - 1];
        const sameItem = itemRef.current === itemId && last?.role === role;
        if (!sameItem) {
          itemRef.current = itemId;
          draftRef.current = chunk;
          next.push({ role, text: chunk });
          return next.slice(-8);
        }
        draftRef.current = final ? chunk : merge(draftRef.current, chunk);
        next[next.length - 1] = { role, text: draftRef.current };
        return next.slice(-8);
      });

      if (final) {
        itemRef.current = null;
        draftRef.current = "";
      }
    },
    [],
  );

  const start = useCallback(async () => {
    if (status === "connecting" || status === "live") return;
    setError(null);
    setMessages([]);
    setStatus("connecting");
    goalTimersRef.current.forEach((t) => clearTimeout(t));
    goalTimersRef.current.clear();
    seenGoalTokensRef.current = [];

    try {
      const tokenRes = await fetch("/api/activity-voice-token", { method: "POST" });
      const tokenData = await tokenRes.json();
      const ephemeralKey = tokenData?.client_secret?.value ?? tokenData?.value;
      if (!ephemeralKey) throw new Error(tokenData?.error ?? "No voice token");

      const pc = new RTCPeerConnection();
      peerRef.current = pc;

      const audio = document.createElement("audio");
      audio.autoplay = true;
      pc.ontrack = (e) => {
        audio.srcObject = e.streams[0];
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const channel = pc.createDataChannel("oai-events");
      channelRef.current = channel;

      channel.addEventListener("open", () => {
        const sessionInstruction = [
          buildModeInstructions(mode, activityName),
          COACH_INSTRUCTIONS,
          currentDraftSummary
            ? `Current form state: ${currentDraftSummary}.${
                mode === "edit"
                  ? ""
                  : " Don't ask about fields that are already filled — focus on missing details."
              }`
            : "",
        ]
          .filter(Boolean)
          .join(" ");

        channel.send(
          JSON.stringify({
            type: "session.update",
            session: {
              type: "realtime",
              instructions: sessionInstruction,
              tools: [UPDATE_FIELDS_TOOL],
              tool_choice: "auto",
              audio: {
                input: { transcription: { model: "gpt-4o-transcribe" } },
              },
            },
          }),
        );

        channel.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [{ type: "input_text", text: "Begin the session now." }],
            },
          }),
        );
        channel.send(JSON.stringify({ type: "response.create" }));
      });

      channel.addEventListener("message", (event) => {
        const payload = JSON.parse(event.data);

        if (
          payload.type === "conversation.item.input_audio_transcription.completed" &&
          payload.transcript
        ) {
          upsertMessage(
            "student",
            payload.item_id ?? `student-${Date.now()}`,
            payload.transcript,
            true,
          );

          // Deterministic backstop: capture explicit goals from the student's
          // own words even if the model never calls update_fields. Each is held
          // briefly so a model capture (recorded in seenGoalTokensRef) can
          // pre-empt it and we don't write the same goal twice.
          for (const goal of detectGoalsInTranscript(payload.transcript)) {
            const tokens = goalTokens(goal.title);
            if (!tokens.size) continue;
            const sig = [...tokens].sort().join(" ");
            if (goalTimersRef.current.has(sig)) continue;
            if (seenGoalTokensRef.current.some((t) => goalsSimilar(t, tokens))) continue;
            const timer = setTimeout(() => {
              goalTimersRef.current.delete(sig);
              if (seenGoalTokensRef.current.some((t) => goalsSimilar(t, tokens))) return;
              seenGoalTokensRef.current.push(tokens);
              onUpdate({ goals: [goal] });
            }, 2000);
            goalTimersRef.current.set(sig, timer);
          }
        }
        if (payload.type === "conversation.item.input_audio_transcription.delta" && payload.delta) {
          upsertMessage("student", payload.item_id ?? `student-${Date.now()}`, payload.delta);
        }
        if (payload.type === "response.output_audio_transcript.delta" && payload.delta) {
          upsertMessage("coach", payload.item_id ?? `coach-${Date.now()}`, payload.delta);
        }
        if (payload.type === "response.output_audio_transcript.done") {
          coachItemIdRef.current = null;
          coachDraftRef.current = "";
        }

        // Tool call extraction — the AI emits structured field updates via this event.
        // Multiple shapes are possible depending on the realtime model version, so we
        // handle the common ones defensively.
        if (
          payload.type === "response.function_call_arguments.done" ||
          payload.type === "response.tool_call.done"
        ) {
          try {
            const argString = payload.arguments ?? payload.function_call?.arguments ?? "{}";
            const args = JSON.parse(argString);
            applyUpdate(args, onUpdate);
            // Record goals the model captured so the transcript backstop won't
            // write an equivalent goal a second time.
            if (Array.isArray(args.goals)) {
              for (const g of args.goals) {
                if (g && typeof g.title === "string" && g.title.trim()) {
                  seenGoalTokensRef.current.push(goalTokens(g.title));
                }
              }
            }
            // Send tool output so the model knows the call succeeded.
            channel.send(
              JSON.stringify({
                type: "conversation.item.create",
                item: {
                  type: "function_call_output",
                  call_id: payload.call_id ?? payload.tool_call?.call_id,
                  output: JSON.stringify({ ok: true }),
                },
              }),
            );
            channel.send(JSON.stringify({ type: "response.create" }));
          } catch (err) {
            console.warn("Failed to parse tool call args", err);
          }
        }

        if (payload.type === "error") {
          setError(payload.error?.message ?? "Realtime error");
        }
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
      });
      if (!sdpRes.ok) throw new Error(await sdpRes.text());

      await pc.setRemoteDescription({ type: "answer", sdp: await sdpRes.text() });
      setStatus("live");
    } catch (e) {
      cleanup();
      setStatus("error");
      setError(e instanceof Error ? e.message : "Voice setup failed");
    }
  }, [status, onUpdate, currentDraftSummary, mode, activityName, upsertMessage, cleanup]);

  const stop = useCallback(() => cleanup(), [cleanup]);

  return (
    <div className="rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Sparkles className="text-[color:var(--almanac-ink)]" size={16} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[color:var(--almanac-ink)]">Voice mode</p>
          <p className="text-xs text-[color:var(--almanac-ink-soft)]">
            Talk through your activity. The coach asks short questions and fills the form as you speak.
          </p>
        </div>
        {status === "live" ? (
          <button
            className="inline-flex items-center gap-2 rounded-full bg-[#b0453b] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            onClick={stop}
            type="button"
          >
            <PhoneOff size={14} />
            Stop
          </button>
        ) : status === "connecting" ? (
          <button
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--almanac-ink)] px-4 py-2 text-sm font-medium text-[color:var(--almanac-paper)] opacity-70"
            disabled
            type="button"
          >
            <Loader2 className="animate-spin" size={14} />
            Connecting…
          </button>
        ) : (
          <button
            className="inline-flex items-center gap-2 rounded-full bg-[#2f5d46] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            onClick={start}
            type="button"
          >
            <Mic size={14} />
            Start voice
          </button>
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}

      {(status === "live" || messages.length > 0) && (
        <div className="mt-3 max-h-40 space-y-2 overflow-y-auto rounded-lg border border-[color:var(--almanac-rule)] bg-white/50 p-2">
          {messages.length === 0 && (
            <p className="text-xs text-[color:var(--almanac-ink-soft)]">Connecting...</p>
          )}
          {messages.map((m, i) => (
            <div className="text-xs leading-5" key={`${m.role}-${i}`}>
              <span className="font-semibold uppercase tracking-wide text-[color:var(--almanac-ink-soft)]">
                {m.role === "student" ? "You" : "Coach"}
              </span>{" "}
              <span className="text-[color:var(--almanac-ink)]">{m.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function applyUpdate(args: VoiceFieldUpdate, onUpdate: (u: VoiceFieldUpdate) => void) {
  const clean: VoiceFieldUpdate = {};
  if (typeof args.name === "string" && args.name.trim()) clean.name = args.name.trim();
  if (typeof args.category === "string" && args.category.trim()) clean.category = args.category.trim();
  if (typeof args.position === "string" && args.position.trim()) clean.position = args.position.trim();
  if (typeof args.description === "string" && args.description.trim()) {
    clean.description = args.description.trim();
  }
  if (
    typeof args.organization_description === "string" &&
    args.organization_description.trim()
  ) {
    clean.organization_description = args.organization_description.trim();
  }
  if (Array.isArray(args.grades)) clean.grades = args.grades.filter((g): g is string => typeof g === "string");
  if (typeof args.start_date === "string" && args.start_date.trim()) clean.start_date = args.start_date.trim();
  if (typeof args.end_date === "string" && args.end_date.trim()) clean.end_date = args.end_date.trim();
  if (typeof args.in_progress === "boolean") clean.in_progress = args.in_progress;
  if (typeof args.hours_per_week === "number") clean.hours_per_week = args.hours_per_week;
  if (typeof args.weeks_per_year === "number") clean.weeks_per_year = args.weeks_per_year;
  if (Array.isArray(args.tags)) clean.tags = args.tags.filter((t): t is string => typeof t === "string");
  if (Array.isArray(args.goals)) {
    const goals = args.goals
      .filter(
        (g): g is { title: string; target_date?: string } =>
          !!g && typeof g === "object" && typeof g.title === "string" && g.title.trim().length > 0,
      )
      .map((g) => ({
        title: g.title.trim(),
        target_date: typeof g.target_date === "string" ? g.target_date.trim() : undefined,
      }));
    if (goals.length) clean.goals = goals;
  }
  onUpdate(clean);
}
