"use client";

import { Loader2, Mic, PhoneOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type VoiceStatus = "idle" | "connecting" | "live" | "error";

type VoicePanelProps = {
  currentPrompt?: string;
  onTranscript?: (transcript: string) => void;
  onReview?: () => void;
  sessionFocus?: string;
  sessionPrompts?: readonly string[];
  sessionTitle?: string;
  variant?: "default" | "almanac";
};

export function VoicePanel({
  currentPrompt,
  onTranscript,
  onReview,
  sessionFocus,
  sessionPrompts,
  sessionTitle,
  variant = "default",
}: VoicePanelProps) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [messages, setMessages] = useState<Array<{ role: "student" | "coach"; text: string }>>(
    [],
  );
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const studentItemIdRef = useRef<string | null>(null);
  const coachItemIdRef = useRef<string | null>(null);
  const studentDraftRef = useRef("");
  const coachDraftRef = useRef("");
  const cleanupVoice = useCallback((resetStatus = true) => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    peerRef.current?.close();
    streamRef.current = null;
    peerRef.current = null;
    audioRef.current = null;
    studentItemIdRef.current = null;
    coachItemIdRef.current = null;
    studentDraftRef.current = "";
    coachDraftRef.current = "";
    if (resetStatus) {
      setStatus("idle");
    }
  }, []);

  useEffect(() => () => cleanupVoice(false), [cleanupVoice]);

  async function startVoice() {
    if (status === "connecting" || status === "live") return;
    setMessages([]);
    studentItemIdRef.current = null;
    coachItemIdRef.current = null;
    studentDraftRef.current = "";
    coachDraftRef.current = "";
    setStatus("connecting");

    try {
      const tokenResponse = await fetch("/api/realtime-token");
      const tokenData = await tokenResponse.json();
      const ephemeralKey = tokenData?.client_secret?.value ?? tokenData?.value;

      if (!ephemeralKey) {
        throw new Error(tokenData?.error ?? "Missing realtime client secret.");
      }

      const pc = new RTCPeerConnection();
      peerRef.current = pc;

      const audioElement = document.createElement("audio");
      audioElement.autoplay = true;
      audioRef.current = audioElement;
      pc.ontrack = (event) => {
        audioElement.srcObject = event.streams[0];
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const dataChannel = pc.createDataChannel("oai-events");
      dataChannel.addEventListener("open", () => {
        dataChannel.send(
          JSON.stringify({
            type: "session.update",
            session: {
              type: "realtime",
              audio: {
                input: {
                  transcription: {
                    model: "gpt-4o-transcribe",
                  },
                },
              },
            },
          }),
        );

        const sessionInstruction = sessionTitle
          ? [
              "You are Cultvr, a concise college counselling voice coach for a high school student.",
              `The selected guided reflection is: ${sessionTitle}.`,
              sessionFocus ? `Session focus: ${sessionFocus}.` : "",
              currentPrompt ? `Start with this prompt: ${currentPrompt}.` : "",
              sessionPrompts?.length
                ? `Use these counselor prompts as private direction, not a checklist: ${sessionPrompts.join(" | ")}.`
                : "",
              "Keep the conversation free-flowing. Ask one short question at a time, listen, then redirect gently toward concrete details, impact, values, evidence, and reflection that match the selected session.",
              "Do not list every prompt upfront. Do not force goals or tasks. When the student has enough useful material, give a brief spoken recap of the main points and tell them they can stop and review.",
            ]
              .filter(Boolean)
              .join(" ")
          : "Start as a concise college planning coach. Ask what the student wants to work on today.";

        dataChannel.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: sessionInstruction,
                },
              ],
            },
          }),
        );
        dataChannel.send(JSON.stringify({ type: "response.create" }));
      });
      dataChannel.addEventListener("message", (event) => {
        const payload = JSON.parse(event.data);
        if (
          payload.type === "conversation.item.input_audio_transcription.completed" &&
          payload.transcript
        ) {
          onTranscript?.(payload.transcript);
          upsertTranscriptMessage(
            "student",
            payload.item_id ?? `student-${Date.now()}`,
            payload.transcript,
            true,
          );
        }
        if (payload.type === "conversation.item.input_audio_transcription.delta" && payload.delta) {
          upsertTranscriptMessage(
            "student",
            payload.item_id ?? `student-${Date.now()}`,
            payload.delta,
          );
        }
        if (payload.type === "response.output_audio_transcript.delta" && payload.delta) {
          upsertTranscriptMessage(
            "coach",
            payload.item_id ?? `coach-${Date.now()}`,
            payload.delta,
          );
        }
        if (payload.type === "response.output_audio_transcript.done") {
          coachItemIdRef.current = null;
          coachDraftRef.current = "";
        }
        if (payload.type === "response.done") {
          coachItemIdRef.current = null;
          coachDraftRef.current = "";
        }
        if (payload.type === "error") {
          setMessages((current) => [
            ...current.slice(-7),
            { role: "coach", text: payload.error?.message ?? "Realtime error" },
          ]);
        }
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(await sdpResponse.text());
      }

      await pc.setRemoteDescription({
        type: "answer",
        sdp: await sdpResponse.text(),
      });

      setStatus("live");
      setMessages((current) => [
        ...current.slice(-7),
        { role: "coach", text: "Voice session connected." },
      ]);
    } catch {
      stopVoice();
      setStatus("error");
      setMessages((current) => [
        ...current.slice(-7),
        { role: "coach", text: "Voice setup failed." },
      ]);
    }
  }

  function stopVoice() {
    cleanupVoice();
  }

  const isAlmanac = variant === "almanac";
  const isLive = status === "live";
  const isConnecting = status === "connecting";
  const isStopping = isLive;
  const actionLabel = isLive ? "Stop" : isConnecting ? "Starting..." : "Start";
  const actionHint = isLive
    ? "Stop the current voice session."
    : isConnecting
      ? "Connecting the voice coach."
      : "Start talking naturally. The coach will guide the conversation toward this session without turning it into a form.";
  const actionIcon = isLive ? (
    <PhoneOff size={16} strokeWidth={2.1} />
  ) : isConnecting ? (
    <Loader2 size={16} strokeWidth={2.1} className="animate-spin" />
  ) : (
    <Mic size={16} strokeWidth={2.1} />
  );
  const actionClassName = isAlmanac
    ? isLive
      ? "inline-flex h-12 min-w-[9.75rem] items-center justify-center gap-2 rounded-full bg-[#b0453b] px-5 text-sm font-medium text-[color:var(--almanac-paper)] transition-colors disabled:opacity-50"
      : "inline-flex h-12 min-w-[9.75rem] items-center justify-center gap-2 rounded-full bg-[#2f5d46] px-5 text-sm font-medium text-[color:var(--almanac-paper)] transition-colors disabled:opacity-50"
    : isLive
      ? "inline-flex h-11 min-w-[8.75rem] items-center justify-center gap-2 rounded-md bg-[#b0453b] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#943a31] disabled:opacity-50"
      : "inline-flex h-11 min-w-[8.75rem] items-center justify-center gap-2 rounded-md bg-[#2f5d46] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#264b39] disabled:opacity-50";

  function upsertTranscriptMessage(
    role: "student" | "coach",
    itemId: string,
    chunk: string,
    final = false,
  ) {
    const itemRef = role === "student" ? studentItemIdRef : coachItemIdRef;
    const draftRef = role === "student" ? studentDraftRef : coachDraftRef;
    const mergeChunk = (current: string, next: string) => {
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

    setMessages((current) => {
      const next = [...current];
      const last = next[next.length - 1];
      const sameItem = itemRef.current === itemId && last?.role === role;

      if (!sameItem) {
        itemRef.current = itemId;
        draftRef.current = chunk;
        next.push({ role, text: chunk });
        return next.slice(-7);
      }

      draftRef.current = final ? chunk : mergeChunk(draftRef.current, chunk);
      next[next.length - 1] = { role, text: draftRef.current };
      return next.slice(-7);
    });

    if (final) {
      itemRef.current = null;
      draftRef.current = "";
    }
  }

  return (
    <div
      className={
        isAlmanac
          ? "rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-5"
          : "rounded-lg border border-black/10 bg-[#fbfaf6] p-4"
      }
    >
      <div className="flex flex-wrap items-center gap-3 md:flex-nowrap md:gap-4">
        <div className="group relative inline-flex">
          <button
            className={actionClassName}
            disabled={isConnecting}
            onClick={isStopping ? stopVoice : startVoice}
            type="button"
          >
            <span className="flex size-5 shrink-0 items-center justify-center">{actionIcon}</span>
            <span className="min-w-[5.5rem] text-center">{actionLabel}</span>
          </button>
          <div className="pointer-events-none absolute left-0 top-full z-10 mt-2 w-72 opacity-0 transition group-hover:opacity-100">
            <div
              className={
                isAlmanac
                  ? "rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] px-3 py-2 text-xs leading-5 text-[color:var(--almanac-ink-soft)] shadow-lg shadow-black/5"
                  : "rounded-lg border border-black/10 bg-white px-3 py-2 text-xs leading-5 text-[#55615b] shadow-lg shadow-black/5"
              }
            >
              {actionHint}
            </div>
          </div>
        </div>
        <span
          className={
            isAlmanac
              ? "rounded-full bg-[color:var(--almanac-paper)] px-4 py-2 text-sm font-medium text-[color:var(--almanac-ink-soft)]"
              : "rounded-md bg-white px-3 py-2 text-sm font-medium text-[#55615b]"
          }
        >
          {status}
        </span>
        {onReview ? (
          <button
            className={
              isAlmanac
                ? "ml-0 inline-flex h-11 items-center justify-center rounded-full bg-[#efc97a] px-5 text-sm font-medium text-[color:var(--almanac-ink)] shadow-sm shadow-black/5 transition hover:bg-[#e7bf68] md:ml-auto"
                : "ml-0 inline-flex h-11 items-center justify-center rounded-full bg-[#efc97a] px-5 text-sm font-medium text-[#17201b] shadow-sm shadow-black/5 transition hover:bg-[#e7bf68] md:ml-auto"
            }
            onClick={onReview}
            type="button"
          >
            End session
          </button>
        ) : null}
      </div>

      <div
        className={
          isAlmanac
            ? "mt-4 rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-4"
            : "mt-4 rounded-lg border border-black/10 bg-white p-4"
        }
      >
        <div className="flex items-center justify-between gap-4">
          <p
            className={
              isAlmanac
                ? "text-[0.68rem] uppercase tracking-[0.18em] text-[color:var(--almanac-ink-soft)]"
                : "text-[0.68rem] uppercase tracking-[0.18em] text-[#6b746f]"
            }
          >
            Live transcript
          </p>
          {status === "live" ? (
            <p
              className={
                isAlmanac
                  ? "text-[0.68rem] uppercase tracking-[0.18em] text-[color:var(--almanac-ink-soft)]"
                  : "text-[0.68rem] uppercase tracking-[0.18em] text-[#6b746f]"
              }
            >
              Streaming
            </p>
          ) : null}
        </div>
        <div className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
          {!messages.length ? (
            <p
              className={
                isAlmanac
                  ? "text-sm leading-6 text-[color:var(--almanac-ink-soft)]"
                  : "text-sm leading-6 text-[#55615b]"
              }
            >
              Start the session to see live speech and responses here.
            </p>
          ) : null}
          {messages.map((message, index) => (
            <div
              className={[
                "rounded-xl border px-3 py-2 text-sm leading-6",
                message.role === "student"
                  ? isAlmanac
                    ? "border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] text-[color:var(--almanac-ink)]"
                    : "border-black/10 bg-[#f7f4ef] text-[#17201b]"
                  : isAlmanac
                    ? "border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] text-[color:var(--almanac-ink)]"
                    : "border-black/10 bg-white text-[#17201b]",
              ].join(" ")}
              key={`${message.role}-${index}-${message.text.slice(0, 12)}`}
            >
              <p
                className={[
                  "mb-1 text-[0.64rem] uppercase tracking-[0.18em]",
                  message.role === "student"
                    ? "text-[color:var(--almanac-ink-soft)]"
                    : "text-[color:var(--almanac-ink-soft)]",
                ].join(" ")}
              >
                {message.role === "student" ? "You" : "Coach"}
              </p>
              <p>{message.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
