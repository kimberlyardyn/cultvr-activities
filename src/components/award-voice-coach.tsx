"use client";

import { Loader2, Mic, PhoneOff, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type AwardVoiceUpdate = {
  name?: string;
  organization?: string;
  scope?: string;
  level?: string;
  year?: string;
  description?: string;
  requirements?: string;
  tags?: string[];
};

type Status = "idle" | "connecting" | "live" | "error";
type TranscriptMessage = { role: "student" | "coach"; text: string };

type Props = {
  onUpdate: (update: AwardVoiceUpdate) => void;
  currentDraftSummary?: string;
  autoStart?: boolean;
};

const COACH_INSTRUCTIONS = [
  "You are Cultvr's awards intake coach. Help a high school student capture one award, honor, or recognition for college applications.",
  "Conduct a natural, FRIENDLY conversation — do NOT read fields as a checklist. Keep spoken responses SHORT (one or two sentences). Listen more than you speak. Ask ONE question at a time.",
  "Walk through the award SECTION BY SECTION:",
  "1) AWARD NAME — what's it called?",
  "2) ISSUING ORGANIZATION — who gave it?",
  "3) LEVEL — School / Regional / State / National / International / Other",
  "4) YEAR — when did they receive it?",
  "5) SCOPE — what makes it meaningful (e.g. 'top 1% of 1.5M test takers', 'selected from 800 applicants')",
  "6) REQUIREMENTS — ASK: 'What was needed to earn this? Test score, application, judging rounds?' (Fill requirements field if shared.)",
  "7) DESCRIPTION — gather rich narrative context.",
  "8) TAGS — suggest a few (STEM, Humanities, Academic, Service, Creativity, Leadership, Passion Project) and confirm.",
  "9) GOALS — ASK: 'Is there a next-step goal tied to this — advance from Commended to Finalist, place higher next year? Any timeline?' If yes, mention they can add it in the Goals & Targets section after saving.",
  "",
  "CRITICAL — DESCRIPTION VOICE & STYLE:",
  "The description ends up on the student's RESUME and college applications. Write it in CONCISE FIRST-PERSON RESUME PROSE.",
  "- USE 'I' voice: 'I placed first…', 'I was recognized…', 'I qualified…'.",
  "- DO NOT use third person ('they', 'their', 'this student').",
  "- DO NOT include opinion phrases like 'I'm so proud of this'.",
  "- DO use strong verbs and concrete numbers: 'placed', 'qualified', 'selected', 'top 1%', 'one of 50'.",
  "- KEEP it 1–3 polished sentences. Tight, factual, professional.",
  "Example GOOD: 'I placed first in Lincoln-Douglas debate at the California state championship, winning six elimination rounds against the top 32 competitors statewide.'",
  "Example BAD: 'This student is really good at debate and won a big tournament. It was such an exciting day for them.'",
  "",
  "As you learn details, call the `update_fields` tool to fill the form. Call it AS OFTEN AS YOU LEARN something new — overwrite description with the improved polished version as the conversation progresses.",
  "",
  "Start by warmly asking what award they want to add. When done, give a brief verbal summary and remind them they can refine fields or add goals before saving.",
].join(" ");

const UPDATE_FIELDS_TOOL = {
  type: "function",
  name: "update_fields",
  description:
    "Update one or more fields on the award form. Call this whenever you learn new information from the student.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Award name" },
      organization: { type: "string", description: "Issuing organization" },
      level: {
        type: "string",
        enum: ["School", "Regional", "State", "National", "International", "Other"],
      },
      year: { type: "string", description: "Year received, YYYY" },
      scope: { type: "string", description: "Context, e.g. 'top 1% of 1.5M test takers'" },
      description: {
        type: "string",
        description:
          "Polished first-person resume-style narrative. 1–3 tight sentences. Use 'I' voice, action verbs, concrete numbers. No third person, no opinion phrases.",
      },
      requirements: {
        type: "string",
        description:
          "Optional. Criteria / how the award is earned (e.g. 'qualified via regional placement, then 6 elimination rounds at state').",
      },
      tags: { type: "array", items: { type: "string" } },
    },
    additionalProperties: false,
  },
};

export function AwardVoiceCoach({ onUpdate, currentDraftSummary, autoStart = false }: Props) {
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
    if (resetStatus) setStatus("idle");
  }, []);

  useEffect(() => () => cleanup(false), [cleanup]);

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
          COACH_INSTRUCTIONS,
          currentDraftSummary
            ? `Current form state: ${currentDraftSummary}. Don't ask about fields that are already filled — focus on missing details.`
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
              audio: { input: { transcription: { model: "gpt-4o-transcribe" } } },
            },
          }),
        );

        channel.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [{ type: "input_text", text: "Hi — let's get started." }],
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
          upsertMessage("student", payload.item_id ?? `student-${Date.now()}`, payload.transcript, true);
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

        if (
          payload.type === "response.function_call_arguments.done" ||
          payload.type === "response.tool_call.done"
        ) {
          try {
            const argString = payload.arguments ?? payload.function_call?.arguments ?? "{}";
            const args = JSON.parse(argString);
            applyUpdate(args, onUpdate);
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
  }, [status, onUpdate, currentDraftSummary, upsertMessage, cleanup]);

  useEffect(() => {
    if (autoStart) {
      void start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  const stop = useCallback(() => cleanup(), [cleanup]);

  return (
    <div className="rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Sparkles className="text-[color:var(--almanac-ink)]" size={16} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[color:var(--almanac-ink)]">Voice mode</p>
          <p className="text-xs text-[color:var(--almanac-ink-soft)]">
            Talk through your award. The coach asks short questions and fills the form as you speak.
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

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

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

function applyUpdate(args: AwardVoiceUpdate, onUpdate: (u: AwardVoiceUpdate) => void) {
  const clean: AwardVoiceUpdate = {};
  if (typeof args.name === "string" && args.name.trim()) clean.name = args.name.trim();
  if (typeof args.organization === "string" && args.organization.trim()) clean.organization = args.organization.trim();
  if (typeof args.scope === "string" && args.scope.trim()) clean.scope = args.scope.trim();
  if (typeof args.level === "string" && args.level.trim()) clean.level = args.level.trim();
  if (typeof args.year === "string" && args.year.trim()) clean.year = args.year.trim();
  if (typeof args.description === "string" && args.description.trim()) clean.description = args.description.trim();
  if (typeof args.requirements === "string" && args.requirements.trim()) clean.requirements = args.requirements.trim();
  if (Array.isArray(args.tags)) clean.tags = args.tags.filter((t): t is string => typeof t === "string");
  onUpdate(clean);
}
